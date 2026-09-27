import type { OfflineMutation } from './types';

type Entry = { exerciseId?: unknown };

function withoutExercise(value: unknown, exerciseId: string): unknown {
	return Array.isArray(value)
		? value.filter((entry: Entry) => entry?.exerciseId !== exerciseId)
		: value;
}

/**
 * Deleting something that was created offline removes the create instead of
 * sending both. Other queued changes may still reference it, and the API would
 * reject them, so those references are dropped too.
 */
function dropReferences(queue: OfflineMutation[], deleted: OfflineMutation): OfflineMutation[] {
	if (deleted.entity === 'routine') {
		return queue
			.filter(
				(item) => !(item.entity === 'schedule' && item.payload.routineId === deleted.entityId)
			)
			.map((item) =>
				item.entity === 'session' && item.payload.routineId === deleted.entityId
					? { ...item, payload: { ...item.payload, routineId: null } }
					: item
			);
	}
	if (deleted.entity === 'exercise') {
		return queue
			.map((item) => {
				if (item.operation !== 'create' && item.operation !== 'update') return item;
				if (item.entity === 'routine' && 'exercises' in item.payload) {
					return {
						...item,
						payload: {
							...item.payload,
							exercises: withoutExercise(item.payload.exercises, deleted.entityId)
						}
					};
				}
				if (item.entity === 'session' && 'entries' in item.payload) {
					return {
						...item,
						payload: {
							...item.payload,
							entries: withoutExercise(item.payload.entries, deleted.entityId)
						}
					};
				}
				return item;
			})
			.filter(
				(item) =>
					!(
						item.entity === 'session' &&
						item.operation === 'create' &&
						Array.isArray(item.payload.entries) &&
						item.payload.entries.length === 0
					)
			);
	}
	return queue;
}

/**
 * Merges a new change into the pending queue. Changes listed in `sent` are part
 * of a request that is already on its way to the server: the server will apply
 * them exactly as sent, so they are never edited or removed here.
 */
export function coalesce(
	queue: OfflineMutation[],
	mutation: OfflineMutation,
	sent: ReadonlySet<string> = new Set()
): OfflineMutation[] {
	const open = (item: OfflineMutation) => !sent.has(item.mutationId);
	const sameTarget = (item: OfflineMutation) =>
		item.entity === mutation.entity && item.entityId === mutation.entityId;
	if (mutation.entity === 'schedule' || mutation.entity === 'settings')
		return [...queue.filter((item) => !(open(item) && sameTarget(item))), mutation];

	const create = queue.find(
		(item) => open(item) && sameTarget(item) && item.operation === 'create'
	);
	if (mutation.operation === 'update' && create) {
		return queue.map((item) =>
			item === create ? { ...item, payload: { ...item.payload, ...mutation.payload } } : item
		);
	}
	const withoutOpenUpdates = queue.filter(
		(item) => !(open(item) && sameTarget(item) && item.operation === 'update')
	);
	if (mutation.operation === 'update') return [...withoutOpenUpdates, mutation];
	if (mutation.operation === 'delete' && create) {
		const others = queue.filter((item) => !sameTarget(item));
		const cleaned = dropReferences(others.filter(open), mutation);
		return [...others.filter((item) => !open(item)), ...cleaned];
	}
	if (mutation.operation === 'delete') return [...withoutOpenUpdates, mutation];
	return [...queue, mutation];
}

/** Runs async tasks one at a time, in the order they were requested. */
export function createMutex() {
	let tail: Promise<unknown> = Promise.resolve();
	return function exclusive<T>(task: () => Promise<T>): Promise<T> {
		const run = tail.then(task, task);
		tail = run.catch(() => undefined);
		return run;
	};
}
