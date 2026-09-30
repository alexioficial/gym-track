import type { Exercise, Measurement, Routine, Session, Weekday } from '$lib/types';
import { newestSessionFirst } from '$lib/utils/progression';
import { isLengthUnit, isWeightUnit } from '$lib/units';
import { isWeekday, type OfflineEntity, type OfflineMutation, type OfflineSnapshot } from './types';

// Applies a queued change to a snapshot the way the server will, so the UI shows
// it before it syncs. Shared by the user's own store and the coach's.

function clone<T>(value: T): T {
	return structuredClone(value);
}

function entityItems(
	snapshot: OfflineSnapshot,
	entity: Exclude<OfflineEntity, 'schedule' | 'settings'>
): Exercise[] | Routine[] | Session[] | Measurement[] {
	if (entity === 'measurement') return (snapshot.measurements ??= []);
	return snapshot[`${entity}s` as 'exercises' | 'routines' | 'sessions'];
}

function sortSnapshot(snapshot: OfflineSnapshot): void {
	snapshot.exercises.sort((a, b) => a.name.localeCompare(b.name));
	snapshot.routines.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
	snapshot.sessions.sort(newestSessionFirst);
	snapshot.measurements?.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

export function applyMutation(
	snapshot: OfflineSnapshot,
	mutation: OfflineMutation
): OfflineSnapshot {
	const next = clone(snapshot);
	if (mutation.entity === 'settings') {
		if (isWeightUnit(mutation.payload.weightUnit))
			next.settings = { ...next.settings, weightUnit: mutation.payload.weightUnit };
		if (isLengthUnit(mutation.payload.lengthUnit))
			next.settings = { ...next.settings, lengthUnit: mutation.payload.lengthUnit };
		return next;
	}
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
			} else if (mutation.entity === 'measurement') {
				(items as Measurement[]).push({
					...(clone(mutation.payload) as Omit<Measurement, 'id' | 'createdAt'>),
					id: mutation.entityId,
					items: Array.isArray(mutation.payload.items)
						? (mutation.payload.items as Measurement['items'])
						: [],
					photos: Array.isArray(mutation.payload.photos)
						? (mutation.payload.photos as string[])
						: [],
					createdAt: mutation.createdAt
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
