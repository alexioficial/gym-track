import { browser } from '$app/environment';
import { get, writable } from 'svelte/store';
import type { Exercise, Routine, Schedule, Session, Weekday } from '$lib/types';
import { newestSessionFirst } from '$lib/utils/progression';
import {
	emptySchedule,
	isWeekday,
	type OfflineEntity,
	type OfflineMutation,
	type OfflineOperation,
	type OfflineSnapshot,
	type OfflineSyncResponse,
	type SyncStatus
} from './types';

const DB_NAME = 'gym-tracker-offline';
const DB_VERSION = 1;
const SNAPSHOTS = 'snapshots';
const MUTATIONS = 'mutations';

type StoredSnapshot = {
	userId: string;
	snapshot: OfflineSnapshot;
	updatedAt: number;
};
type StoredMutation = OfflineMutation & { userId: string };

export const offlineData = writable<OfflineSnapshot | null>(null);
export const syncStatus = writable<SyncStatus>({ phase: 'idle', pending: 0, message: null });

let currentUserId: string | null = null;
let currentSnapshot: OfflineSnapshot | null = null;
let initializing: Promise<void> | null = null;
let syncing: Promise<void> | null = null;
let onlineListener: (() => void) | null = null;

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

function request<T>(value: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		value.onsuccess = () => resolve(value.result);
		value.onerror = () => reject(value.error ?? new Error('Local storage request failed'));
	});
}

function completed(transaction: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		transaction.oncomplete = () => resolve();
		transaction.onabort = () =>
			reject(transaction.error ?? new Error('Local storage transaction failed'));
		transaction.onerror = () =>
			reject(transaction.error ?? new Error('Local storage transaction failed'));
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

function entityItems(
	snapshot: OfflineSnapshot,
	entity: Exclude<OfflineEntity, 'schedule'>
): Exercise[] | Routine[] | Session[] {
	return snapshot[`${entity}s` as 'exercises' | 'routines' | 'sessions'];
}

function sortSnapshot(snapshot: OfflineSnapshot): void {
	snapshot.exercises.sort((a, b) => a.name.localeCompare(b.name));
	snapshot.routines.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
	snapshot.sessions.sort(newestSessionFirst);
}

function applyMutation(snapshot: OfflineSnapshot, mutation: OfflineMutation): OfflineSnapshot {
	const next = clone(snapshot);
	if (mutation.entity === 'schedule') {
		if (mutation.operation === 'set' && isWeekday(mutation.entityId)) {
			next.schedule[mutation.entityId] =
				typeof mutation.payload.routineId === 'string' ? mutation.payload.routineId : null;
		}
		return next;
	}

	const items = entityItems(next, mutation.entity);
	const index = items.findIndex((item) => item.id === mutation.entityId);
	if (mutation.operation === 'create') {
		if (index < 0) {
			if (mutation.entity === 'exercise') {
				(items as Exercise[]).push({
					id: mutation.entityId,
					name: String(mutation.payload.name ?? ''),
					muscleGroup: String(mutation.payload.muscleGroup ?? ''),
					...(typeof mutation.payload.notes === 'string' && mutation.payload.notes
						? { notes: mutation.payload.notes }
						: {})
				});
			} else if (mutation.entity === 'routine') {
				const exercises = Array.isArray(mutation.payload.exercises)
					? (mutation.payload.exercises as Routine['exercises'])
					: [];
				(items as Routine[]).push({
					id: mutation.entityId,
					name: String(mutation.payload.name ?? ''),
					color: String(mutation.payload.color ?? '#EAB308'),
					order:
						typeof mutation.payload.order === 'number'
							? mutation.payload.order
							: next.routines.length,
					exercises
				});
			} else {
				(items as Session[]).push({
					id: mutation.entityId,
					date: String(mutation.payload.date ?? ''),
					createdAt: mutation.createdAt,
					routineId:
						typeof mutation.payload.routineId === 'string' ? mutation.payload.routineId : null,
					...(typeof mutation.payload.notes === 'string' && mutation.payload.notes
						? { notes: mutation.payload.notes }
						: {}),
					entries: Array.isArray(mutation.payload.entries)
						? (mutation.payload.entries as Session['entries'])
						: []
				});
			}
		}
	} else if (mutation.operation === 'update' && index >= 0) {
		Object.assign(items[index], clone(mutation.payload));
	} else if (mutation.operation === 'delete') {
		if (index >= 0) items.splice(index, 1);
		if (mutation.entity === 'exercise') {
			for (const routine of next.routines) {
				routine.exercises = routine.exercises.filter(
					(entry) => entry.exerciseId !== mutation.entityId
				);
			}
		} else if (mutation.entity === 'routine') {
			for (const day of Object.keys(next.schedule) as Weekday[]) {
				if (next.schedule[day] === mutation.entityId) next.schedule[day] = null;
			}
		}
	}
	sortSnapshot(next);
	return next;
}

function coalesce(queue: OfflineMutation[], mutation: OfflineMutation): OfflineMutation[] {
	const sameTarget = (item: OfflineMutation) =>
		item.entity === mutation.entity && item.entityId === mutation.entityId;
	if (mutation.entity === 'schedule')
		return [...queue.filter((item) => !sameTarget(item)), mutation];

	const create = queue.find((item) => sameTarget(item) && item.operation === 'create');
	if (mutation.operation === 'update' && create) {
		return queue.map((item) =>
			item === create ? { ...item, payload: { ...item.payload, ...mutation.payload } } : item
		);
	}
	if (mutation.operation === 'update') {
		return [
			...queue.filter((item) => !(sameTarget(item) && item.operation === 'update')),
			mutation
		];
	}
	if (mutation.operation === 'delete' && create) {
		return queue.filter((item) => !sameTarget(item));
	}
	if (mutation.operation === 'delete') {
		return [
			...queue.filter((item) => !(sameTarget(item) && item.operation === 'update')),
			mutation
		];
	}
	return [...queue, mutation];
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
	if (!currentUserId || !currentSnapshot) throw new Error('Offline data is not ready yet');
}

export function newEntityId(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(12));
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function initializeOffline(userId: string, seed: OfflineSnapshot): Promise<void> {
	if (!browser || currentUserId === userId) return;
	currentUserId = userId;
	initializing = (async () => {
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
	const mutation: OfflineMutation = {
		mutationId: crypto.randomUUID(),
		entity,
		operation,
		entityId,
		payload: clone(payload),
		createdAt: Date.now()
	};
	currentSnapshot = applyMutation(currentSnapshot!, mutation);
	const queue = coalesce(await readMutations(currentUserId!), mutation);
	await Promise.all([
		writeSnapshot(currentUserId!, currentSnapshot),
		replaceMutations(currentUserId!, queue)
	]);
	offlineData.set(clone(currentSnapshot));
	await updateStatus(navigator.onLine ? 'idle' : 'offline');
	if (navigator.onLine) void synchronize();
}

export async function synchronize(): Promise<void> {
	if (!browser || !navigator.onLine || !currentUserId || !currentSnapshot) return;
	if (syncing) return syncing;
	syncing = (async () => {
		try {
			const pending = await readMutations(currentUserId!);
			syncStatus.set({ phase: 'syncing', pending: pending.length, message: null });
			const response = await fetch('/api/offline/sync', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ mutations: pending })
			});
			if (!response.ok) {
				const message = await response
					.json()
					.then((body: { error?: string }) => body.error ?? 'Could not synchronize your changes')
					.catch(() => 'Could not synchronize your changes');
				throw new Error(message);
			}
			const body = (await response.json()) as OfflineSyncResponse;
			const applied = new Set(body.applied.map((item) => item.mutationId));
			const remaining = (await readMutations(currentUserId!)).filter(
				(item) => !applied.has(item.mutationId)
			);
			let merged = clone(body.snapshot);
			for (const mutation of remaining) merged = applyMutation(merged, mutation);
			currentSnapshot = merged;
			await Promise.all([
				writeSnapshot(currentUserId!, merged),
				replaceMutations(currentUserId!, remaining)
			]);
			offlineData.set(clone(merged));
			await updateStatus('synced');
		} catch (error) {
			await updateStatus(
				navigator.onLine ? 'error' : 'offline',
				error instanceof Error ? error.message : null
			);
		} finally {
			syncing = null;
		}
	})();
	return syncing;
}

export async function clearOfflineData(userId?: string): Promise<void> {
	if (!browser) return;
	if (onlineListener) window.removeEventListener('online', onlineListener);
	onlineListener = null;
	const targetUserId = currentUserId ?? userId;
	currentUserId = null;
	currentSnapshot = null;
	offlineData.set(null);
	syncStatus.set({ phase: 'idle', pending: 0, message: null });
	if (!targetUserId) return;
	const db = await database();
	const tx = db.transaction([SNAPSHOTS, MUTATIONS], 'readwrite');
	tx.objectStore(SNAPSHOTS).delete(targetUserId);
	const store = tx.objectStore(MUTATIONS);
	const keys = await request(store.index('by-user').getAllKeys(targetUserId));
	for (const key of keys) store.delete(key);
	await completed(tx);
}

export function currentOfflineSnapshot(): OfflineSnapshot {
	return (
		get(offlineData) ?? {
			exercises: [],
			routines: [],
			sessions: [],
			schedule: emptySchedule()
		}
	);
}
