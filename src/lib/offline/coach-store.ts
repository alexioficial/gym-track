// The coach's offline copy: every enabled client's data plus the changes the
// coach made for them. It mirrors store.ts (the user's own data) but lives in
// its own database, keyed by coach, and syncs through /api/coach/sync.
import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import type { ClientSummary, CoachClient } from '$lib/coach';
import type { Coach } from '$lib/owner';
import { applyMutation } from './apply';
import { purgeUnsupportedOfflineData } from './environment';
import { completed, request } from './idb';
import { coalesce, createMutex } from './queue';
import type {
	OfflineEntity,
	OfflineMutation,
	OfflineOperation,
	OfflineSyncResult,
	RejectedChange,
	SyncStatus
} from './types';

const DB_NAME = 'gym-tracker-coach';
const DB_VERSION = 1;
const ROSTERS = 'rosters';
const MUTATIONS = 'mutations';
const SYNC_TIMEOUT_MS = 30_000;

export interface CoachRoster {
	coach: Coach;
	clients: CoachClient[];
	disabled: ClientSummary[];
}

export type CoachMutation = OfflineMutation & { clientId: string };
export type CoachRejectedChange = RejectedChange & { clientId: string };

type StoredRoster = CoachRoster & { coachId: string; updatedAt: number };
type StoredMutation = CoachMutation & { coachId: string };

interface CoachSyncResponse extends CoachRoster {
	applied: OfflineSyncResult[];
}

export const coachData = writable<CoachRoster | null>(null);
export const coachSyncStatus = writable<SyncStatus>({
	phase: 'idle',
	pending: 0,
	message: null
});
export const coachRejectedChanges = writable<CoachRejectedChange[]>([]);

let currentCoachId: string | null = null;
let currentRoster: CoachRoster | null = null;
let initializing: Promise<void> | null = null;
let syncing: Promise<void> | null = null;
let onlineListener: (() => void) | null = null;
const exclusive = createMutex();
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
			if (!db.objectStoreNames.contains(ROSTERS))
				db.createObjectStore(ROSTERS, { keyPath: 'coachId' });
			if (!db.objectStoreNames.contains(MUTATIONS)) {
				const store = db.createObjectStore(MUTATIONS, { keyPath: 'mutationId' });
				store.createIndex('by-coach', 'coachId');
				store.createIndex('by-coach-created', ['coachId', 'createdAt']);
			}
		};
		open.onsuccess = () => resolve(open.result);
		open.onerror = () => reject(open.error ?? new Error('Could not open local storage'));
	});
}

async function readRoster(coachId: string): Promise<CoachRoster | undefined> {
	const db = await database();
	const tx = db.transaction(ROSTERS, 'readonly');
	const value = (await request(tx.objectStore(ROSTERS).get(coachId))) as StoredRoster | undefined;
	await completed(tx);
	return value && { coach: value.coach, clients: value.clients, disabled: value.disabled };
}

async function writeRoster(coachId: string, roster: CoachRoster): Promise<void> {
	const db = await database();
	const tx = db.transaction(ROSTERS, 'readwrite');
	tx.objectStore(ROSTERS).put({ ...roster, coachId, updatedAt: Date.now() } satisfies StoredRoster);
	await completed(tx);
}

async function readMutations(coachId: string): Promise<CoachMutation[]> {
	const db = await database();
	const tx = db.transaction(MUTATIONS, 'readonly');
	const index = tx.objectStore(MUTATIONS).index('by-coach-created');
	const range = IDBKeyRange.bound([coachId, 0], [coachId, Number.MAX_SAFE_INTEGER]);
	const value = (await request(index.getAll(range))) as StoredMutation[];
	await completed(tx);
	return value;
}

async function replaceMutations(coachId: string, mutations: CoachMutation[]): Promise<void> {
	const db = await database();
	const tx = db.transaction(MUTATIONS, 'readwrite');
	const store = tx.objectStore(MUTATIONS);
	const keys = await request(store.index('by-coach').getAllKeys(coachId));
	for (const key of keys) store.delete(key);
	for (const mutation of mutations) store.put({ ...mutation, coachId } satisfies StoredMutation);
	await completed(tx);
}

/** Applies queued changes on top of the server's copy of each client. */
function withPending(roster: CoachRoster, mutations: CoachMutation[]): CoachRoster {
	const next = clone(roster);
	for (const mutation of mutations) {
		const entry = next.clients.find((item) => item.client.id === mutation.clientId);
		if (entry) entry.snapshot = applyMutation(entry.snapshot, mutation);
	}
	return next;
}

async function updateStatus(phase: SyncStatus['phase'], message: string | null = null) {
	const pending = currentCoachId ? (await readMutations(currentCoachId)).length : 0;
	coachSyncStatus.set({ phase, pending, message });
}

/** Loads the stored copy right away, then refreshes it from the server. */
export async function initializeCoach(coachId: string): Promise<void> {
	if (!browser || currentCoachId === coachId) return initializing ?? undefined;
	currentCoachId = coachId;
	initializing = (async () => {
		await purgeUnsupportedOfflineData();
		const [stored, queue] = await Promise.all([readRoster(coachId), readMutations(coachId)]);
		currentRoster = stored ? withPending(stored, queue) : null;
		coachData.set(currentRoster && clone(currentRoster));
		await updateStatus(navigator.onLine ? 'idle' : 'offline');
		if (onlineListener) window.removeEventListener('online', onlineListener);
		onlineListener = () => void synchronizeCoach();
		window.addEventListener('online', onlineListener);
	})();
	await initializing;
	if (navigator.onLine) void synchronizeCoach();
}

/**
 * Saves a change for a client locally and sends it when possible. Only what the
 * API lets a coach do is queued: sessions, measurements and new exercises.
 */
export async function queueCoachMutation(
	clientId: string,
	entity: OfflineEntity,
	operation: OfflineOperation,
	entityId: string,
	payload: Record<string, unknown> = {}
): Promise<void> {
	if (initializing) await initializing;
	const coachId = currentCoachId;
	if (!coachId || !currentRoster) throw new Error('Los datos de tus clientes aún no están listos');
	await exclusive(async () => {
		const roster = currentRoster!;
		const entry = roster.clients.find((item) => item.client.id === clientId);
		if (!entry) throw new Error('Este cliente no está en tu lista');
		const mutation: CoachMutation = {
			mutationId: crypto.randomUUID(),
			clientId,
			entity,
			operation,
			entityId,
			payload: clone(payload),
			createdAt: Date.now()
		};
		entry.snapshot = applyMutation(entry.snapshot, mutation);
		const queue = coalesce(await readMutations(coachId), mutation, sent) as CoachMutation[];
		await replaceMutations(coachId, queue);
		coachData.set(clone(roster));
	});
	await updateStatus(navigator.onLine ? 'idle' : 'offline');
	void synchronizeCoach();
}

export async function synchronizeCoach(): Promise<void> {
	if (!browser || !navigator.onLine || !currentCoachId) return;
	if (syncing) return syncing;
	const coachId = currentCoachId;
	let again = false;
	syncing = (async () => {
		try {
			const pending = await exclusive(async () => {
				const queue = await readMutations(coachId);
				for (const item of queue) sent.add(item.mutationId);
				return queue;
			});
			coachSyncStatus.set({ phase: 'syncing', pending: pending.length, message: null });
			const response = await fetch('/api/coach/sync', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					mutations: pending.map(
						({ mutationId, clientId, entity, operation, entityId, payload }) => ({
							mutationId,
							clientId,
							entity,
							operation,
							entityId,
							payload
						})
					)
				}),
				signal: AbortSignal.timeout(SYNC_TIMEOUT_MS)
			});
			if (!response.ok) {
				const message = await response
					.json()
					.then((body: { error?: string }) => body.error ?? null)
					.catch(() => null);
				throw new Error(message ?? 'No se pudieron sincronizar los cambios de tus clientes');
			}
			const body = (await response.json()) as CoachSyncResponse;
			await exclusive(async () => {
				if (currentCoachId !== coachId) return;
				const byId = new Map(pending.map((item) => [item.mutationId, item]));
				const done = new Set(body.applied.map((item) => item.mutationId));
				const rejected = body.applied.filter((item) => item.status === 'rejected');
				const remaining = (await readMutations(coachId)).filter(
					(item) => !done.has(item.mutationId)
				);
				const server: CoachRoster = {
					coach: body.coach,
					clients: body.clients,
					disabled: body.disabled
				};
				await Promise.all([writeRoster(coachId, server), replaceMutations(coachId, remaining)]);
				currentRoster = withPending(server, remaining);
				coachData.set(clone(currentRoster));
				if (rejected.length) {
					coachRejectedChanges.update((items) => [
						...items,
						...rejected.map((item) => ({
							mutationId: item.mutationId,
							clientId: byId.get(item.mutationId)?.clientId ?? '',
							entity: item.entity,
							operation: item.operation,
							error: item.error ?? 'El servidor rechazó este cambio'
						}))
					]);
				}
				again = remaining.length > 0;
			});
			await updateStatus('synced');
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
		if (again) void synchronizeCoach();
	})();
	return syncing;
}

export async function pendingCoachChangeCount(): Promise<number> {
	return currentCoachId ? (await readMutations(currentCoachId)).length : 0;
}

export function dismissCoachRejectedChanges(): void {
	coachRejectedChanges.set([]);
}

/** On logout: the copy holds other people's data. */
export async function clearCoachData(coachId?: string): Promise<void> {
	const id = coachId ?? currentCoachId;
	if (onlineListener) window.removeEventListener('online', onlineListener);
	onlineListener = null;
	currentCoachId = null;
	currentRoster = null;
	initializing = null;
	coachData.set(null);
	coachRejectedChanges.set([]);
	if (!browser || !id) return;
	const db = await database();
	const tx = db.transaction([ROSTERS, MUTATIONS], 'readwrite');
	tx.objectStore(ROSTERS).delete(id);
	const store = tx.objectStore(MUTATIONS);
	const keys = await request(store.index('by-coach').getAllKeys(id));
	for (const key of keys) store.delete(key);
	await completed(tx);
}
