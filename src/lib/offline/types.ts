import type { Exercise, Routine, Schedule, Session, Weekday } from '$lib/types';
import type { WeightUnit } from '$lib/units';

export type OfflineEntity = 'exercise' | 'routine' | 'session' | 'schedule' | 'settings';
export type OfflineOperation = 'create' | 'update' | 'delete' | 'set';

export interface OfflineSnapshot {
	exercises: Exercise[];
	routines: Routine[];
	sessions: Session[];
	schedule: Schedule;
	/** Missing in snapshots saved before settings existed. */
	settings?: { weightUnit: WeightUnit };
}

export interface OfflineMutation {
	mutationId: string;
	entity: OfflineEntity;
	operation: OfflineOperation;
	entityId: string;
	payload: Record<string, unknown>;
	createdAt: number;
}

export interface OfflineSyncResult extends Pick<
	OfflineMutation,
	'mutationId' | 'entity' | 'operation' | 'entityId'
> {
	status?: 'applied' | 'rejected';
	error?: string;
}

export interface OfflineSyncResponse {
	snapshot: OfflineSnapshot;
	applied: OfflineSyncResult[];
}

export interface RejectedChange {
	mutationId: string;
	entity: OfflineEntity;
	operation: OfflineOperation;
	error: string;
}

export type SyncPhase = 'idle' | 'offline' | 'syncing' | 'synced' | 'error';

export interface SyncStatus {
	phase: SyncPhase;
	pending: number;
	message: string | null;
}

export function emptySchedule(): Schedule {
	return {
		mon: null,
		tue: null,
		wed: null,
		thu: null,
		fri: null,
		sat: null,
		sun: null
	};
}

export function isWeekday(value: string): value is Weekday {
	return ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(value);
}
