import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import {
	DEFAULT_LENGTH_UNIT,
	DEFAULT_WEIGHT_UNIT,
	isLengthUnit,
	isWeightUnit,
	type LengthUnit,
	type WeightUnit
} from '$lib/units';
import {
	type OfflineEntity,
	type OfflineMutation,
	type OfflineOperation,
	type OfflineSnapshot,
	type OfflineSyncResponse,
	type RejectedChange,
	type SyncStatus
} from './types';
import { applyMutation } from './apply';
import { completed, request } from './idb';
import { coalesce, createMutex } from './queue';
import { purgeUnsupportedOfflineData } from './environment';
import { clearRoutesWarm } from './warm';

const DB_NAME = 'gym-tracker-offline';
const DB_VERSION = 1;
const SNAPSHOTS = 'snapshots';
const MUTATIONS = 'mutations';
const SYNC_TIMEOUT_MS = 20_000;

type StoredSnapshot = {
	userId: string;
	snapshot: OfflineSnapshot;
	updatedAt: number;
};
type StoredMutation = OfflineMutation & { userId: string };

export const offlineData = writable<OfflineSnapshot | null>(null);
export const syncStatus = writable<SyncStatus>({ phase: 'idle', pending: 0, message: null });
/** Changes the server refused. They are already out of the queue; this only tells the user. */
export const rejectedChanges = writable<RejectedChange[]>([]);

let currentUserId: string | null = null;
let currentSnapshot: OfflineSnapshot | null = null;
let initializing: Promise<void> | null = null;
let syncing: Promise<void> | null = null;
let onlineListener: (() => void) | null = null;
// Every read-modify-write of the queue and snapshot goes through this, so two
// quick saves (or a save during a sync) cannot overwrite each other.
const exclusive = createMutex();
// Mutation ids included in the sync request currently in flight.
const sent = new Set<string>();

function clone<T>(value: T): T {
	return structuredClone(value);
}

function database(): Promise<IDBDatabase> {
	if (!browser)
		return Promise.reject(new Error('Offline storage is only available in the browser'));
	return new Promise((resolve, reject) => {
		const open = indexedDB.open(DB_NAME, DB_VERSION);
		open.onupgradeneeded = () => {
			const db = open.result;
			if (!db.objectStoreNames.contains(SNAPSHOTS))
				db.createObjectStore(SNAPSHOTS, { keyPath: 'userId' });
			if (!db.objectStoreNames.contains(MUTATIONS)) {
				const store = db.createObjectStore(MUTATIONS, { keyPath: 'mutationId' });
				store.createIndex('by-user', 'userId');
				store.createIndex('by-user-created', ['userId', 'createdAt']);
			}
		};
		open.onsuccess = () => resolve(open.result);
		open.onerror = () => reject(open.error ?? new Error('Could not open local storage'));
	});
}

async function readSnapshot(userId: string): Promise<StoredSnapshot | undefined> {
	const db = await database();
	const tx = db.transaction(SNAPSHOTS, 'readonly');
	const value = await request(tx.objectStore(SNAPSHOTS).get(userId));
	await completed(tx);
	return value as StoredSnapshot | undefined;
}

async function writeSnapshot(userId: string, snapshot: OfflineSnapshot): Promise<void> {
	const db = await database();
	const tx = db.transaction(SNAPSHOTS, 'readwrite');
	tx.objectStore(SNAPSHOTS).put({
		userId,
		snapshot,
		updatedAt: Date.now()
	} satisfies StoredSnapshot);
	await completed(tx);
}

async function readMutations(userId: string): Promise<StoredMutation[]> {
	const db = await database();
	const tx = db.transaction(MUTATIONS, 'readonly');
	const index = tx.objectStore(MUTATIONS).index('by-user-created');
	const range = IDBKeyRange.bound([userId, 0], [userId, Number.MAX_SAFE_INTEGER]);
	const value = await request(index.getAll(range));
	await completed(tx);
	return value as StoredMutation[];
}

async function replaceMutations(userId: string, mutations: OfflineMutation[]): Promise<void> {
	const db = await database();
	const tx = db.transaction(MUTATIONS, 'readwrite');
	const store = tx.objectStore(MUTATIONS);
	const index = store.index('by-user');
	const keys = await request(index.getAllKeys(userId));
	for (const key of keys) store.delete(key);
	for (const mutation of mutations) store.put({ ...mutation, userId } satisfies StoredMutation);
	await completed(tx);
}

async function updateStatus(
	phase: SyncStatus['phase'],
	message: string | null = null
): Promise<void> {
	const pending = currentUserId ? (await readMutations(currentUserId)).length : 0;
	syncStatus.set({ phase, pending, message });
}

async function ensureInitialized(): Promise<void> {
	if (initializing) await initializing;
	if (!currentUserId || !currentSnapshot) throw new Error('Tus datos locales aún no están listos');
}

/**
 * The unit to show. The local snapshot wins because it already includes
 * unsynced changes; the user from the server covers server-side rendering.
 */
export function weightUnitOf(
	snapshot: OfflineSnapshot | null | undefined,
	user: { weightUnit?: WeightUnit } | null | undefined
): WeightUnit {
	const local = snapshot?.settings?.weightUnit;
	if (isWeightUnit(local)) return local;
	return isWeightUnit(user?.weightUnit) ? user.weightUnit : DEFAULT_WEIGHT_UNIT;
}

export function setWeightUnit(weightUnit: WeightUnit): Promise<void> {
	return queueOfflineMutation('settings', 'set', 'weightUnit', { weightUnit });
}

export function lengthUnitOf(
	snapshot: OfflineSnapshot | null | undefined,
	user: { lengthUnit?: LengthUnit } | null | undefined
): LengthUnit {
	const local = snapshot?.settings?.lengthUnit;
	if (isLengthUnit(local)) return local;
	return isLengthUnit(user?.lengthUnit) ? user.lengthUnit : DEFAULT_LENGTH_UNIT;
}

export function setLengthUnit(lengthUnit: LengthUnit): Promise<void> {
	return queueOfflineMutation('settings', 'set', 'lengthUnit', { lengthUnit });
}

export function newEntityId(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(12));
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function initializeOffline(userId: string, seed: OfflineSnapshot): Promise<void> {
	if (!browser || currentUserId === userId) return;
	currentUserId = userId;
	initializing = (async () => {
		await purgeUnsupportedOfflineData();
		const stored = await readSnapshot(userId);
		currentSnapshot = stored?.snapshot ?? clone(seed);
		if (!stored) await writeSnapshot(userId, currentSnapshot);
		offlineData.set(clone(currentSnapshot));
		await updateStatus(navigator.onLine ? 'idle' : 'offline');
		onlineListener = () => void synchronize();
		window.addEventListener('online', onlineListener);
		if (navigator.onLine) void synchronize();
	})();
	try {
		await initializing;
	} finally {
		initializing = null;
	}
}

export async function queueOfflineMutation(
	entity: OfflineEntity,
	operation: OfflineOperation,
	entityId: string,
	payload: Record<string, unknown> = {}
): Promise<void> {
	await ensureInitialized();
	const userId = currentUserId!;
	await exclusive(async () => {
		if (currentUserId !== userId || !currentSnapshot) return;
		const mutation: OfflineMutation = {
			mutationId: crypto.randomUUID(),
			entity,
			operation,
			entityId,
			payload: clone(payload),
			createdAt: Date.now()
		};
		currentSnapshot = applyMutation(currentSnapshot, mutation);
		const queue = coalesce(await readMutations(userId), mutation, sent);
		await Promise.all([writeSnapshot(userId, currentSnapshot), replaceMutations(userId, queue)]);
		offlineData.set(clone(currentSnapshot));
		await updateStatus(navigator.onLine ? 'idle' : 'offline');
	});
	if (navigator.onLine) void synchronize();
}

export async function synchronize(): Promise<void> {
	if (!browser || !navigator.onLine || !currentUserId || !currentSnapshot) return;
	if (syncing) return syncing;
	const userId = currentUserId;
	let again = false;
	syncing = (async () => {
		try {
			const pending = await exclusive(async () => {
				const queue = await readMutations(userId);
				for (const item of queue) sent.add(item.mutationId);
				return queue;
			});
			syncStatus.set({ phase: 'syncing', pending: pending.length, message: null });
			const response = await fetch('/api/offline/sync', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					mutations: pending.map(({ mutationId, entity, operation, entityId, payload }) => ({
						mutationId,
						entity,
						operation,
						entityId,
						payload
					}))
				}),
				signal: AbortSignal.timeout(SYNC_TIMEOUT_MS)
			});
			if (!response.ok) {
				const message = await response
					.json()
					.then(
						(body: { error?: string }) => body.error ?? 'No se pudieron sincronizar tus cambios'
					)
					.catch(() => 'No se pudieron sincronizar tus cambios');
				throw new Error(message);
			}
			const body = (await response.json()) as OfflineSyncResponse;
			await exclusive(async () => {
				// A logout or account switch may have happened while the request ran.
				if (currentUserId !== userId) return;
				// Rejected changes can never succeed, so they leave the queue as well.
				const done = new Set(body.applied.map((item) => item.mutationId));
				const rejected = body.applied.filter((item) => item.status === 'rejected');
				const remaining = (await readMutations(userId)).filter(
					(item) => !done.has(item.mutationId)
				);
				let merged = clone(body.snapshot);
				for (const mutation of remaining) merged = applyMutation(merged, mutation);
				currentSnapshot = merged;
				await Promise.all([writeSnapshot(userId, merged), replaceMutations(userId, remaining)]);
				offlineData.set(clone(merged));
				if (rejected.length) {
					rejectedChanges.update((items) => [
						...items,
						...rejected.map((item) => ({
							mutationId: item.mutationId,
							entity: item.entity,
							operation: item.operation,
							error: item.error ?? 'El servidor rechazó este cambio'
						}))
					]);
				}
				// Changes saved while this request ran go out right away.
				again = remaining.length > 0;
				await updateStatus('synced');
			});
		} catch (error) {
			const message =
				error instanceof DOMException && error.name === 'TimeoutError'
					? 'El servidor tardó demasiado en responder'
					: error instanceof Error
						? error.message
						: null;
			await updateStatus(navigator.onLine ? 'error' : 'offline', message);
		} finally {
			sent.clear();
			syncing = null;
		}
		if (again) void synchronize();
	})();
	return syncing;
}

export async function pendingChangeCount(): Promise<number> {
	return currentUserId ? (await readMutations(currentUserId)).length : 0;
}

export function dismissRejectedChanges(): void {
	rejectedChanges.set([]);
}

export async function clearOfflineData(userId?: string): Promise<void> {
	if (!browser) return;
	if (onlineListener) window.removeEventListener('online', onlineListener);
	onlineListener = null;
	const targetUserId = currentUserId ?? userId;
	currentUserId = null;
	currentSnapshot = null;
	offlineData.set(null);
	rejectedChanges.set([]);
	syncStatus.set({ phase: 'idle', pending: 0, message: null });
	if (!targetUserId) return;
	clearRoutesWarm(localStorage, targetUserId);
	const db = await database();
	const tx = db.transaction([SNAPSHOTS, MUTATIONS], 'readwrite');
	tx.objectStore(SNAPSHOTS).delete(targetUserId);
	const store = tx.objectStore(MUTATIONS);
	const keys = await request(store.index('by-user').getAllKeys(targetUserId));
	for (const key of keys) store.delete(key);
	await completed(tx);
}
