import { describe, expect, test } from 'bun:test';
import { coalesce, createMutex } from '../src/lib/offline/queue.ts';

let counter = 0;
function mutation(entity, operation, entityId, payload = {}) {
	counter += 1;
	return { mutationId: `m${counter}`, entity, operation, entityId, payload, createdAt: counter };
}

describe('offline queue coalescing', () => {
	test('merges an update into a pending create', () => {
		const create = mutation('exercise', 'create', 'e1', { name: 'Bench', muscleGroup: 'Chest' });
		const queue = coalesce([create], mutation('exercise', 'update', 'e1', { name: 'Incline' }));
		expect(queue).toHaveLength(1);
		expect(queue[0].payload).toEqual({ name: 'Incline', muscleGroup: 'Chest' });
	});

	test('never edits a create that is already on its way to the server', () => {
		const create = mutation('exercise', 'create', 'e1', { name: 'Bench' });
		const update = mutation('exercise', 'update', 'e1', { name: 'Incline' });
		const queue = coalesce([create], update, new Set([create.mutationId]));
		expect(queue).toEqual([create, update]);
	});

	test('sends a delete when the create is already in flight', () => {
		const create = mutation('session', 'create', 's1', { entries: [] });
		const remove = mutation('session', 'delete', 's1');
		expect(coalesce([create], remove, new Set([create.mutationId]))).toEqual([create, remove]);
	});

	test('deleting an offline exercise removes it from queued routines and sessions', () => {
		const exercise = mutation('exercise', 'create', 'e1', { name: 'Bench' });
		const routine = mutation('routine', 'create', 'r1', {
			exercises: [
				{ exerciseId: 'e1', sets: 3 },
				{ exerciseId: 'e2', sets: 3 }
			]
		});
		const onlyBench = mutation('session', 'create', 's1', {
			entries: [{ exerciseId: 'e1', sets: [{ weight: 100, reps: 5 }] }]
		});
		const mixed = mutation('session', 'update', 's2', {
			entries: [
				{ exerciseId: 'e1', sets: [{ weight: 100, reps: 5 }] },
				{ exerciseId: 'e2', sets: [{ weight: 50, reps: 8 }] }
			]
		});
		const queue = coalesce(
			[exercise, routine, onlyBench, mixed],
			mutation('exercise', 'delete', 'e1')
		);
		expect(queue.map((item) => item.entityId)).toEqual(['r1', 's2']);
		expect(queue[0].payload.exercises).toEqual([{ exerciseId: 'e2', sets: 3 }]);
		expect(queue[1].payload.entries.map((entry) => entry.exerciseId)).toEqual(['e2']);
	});

	test('deleting an offline routine clears queued schedule days and session links', () => {
		const routine = mutation('routine', 'create', 'r1', { name: 'Push' });
		const monday = mutation('schedule', 'set', 'mon', { routineId: 'r1' });
		const session = mutation('session', 'create', 's1', { routineId: 'r1', entries: [{}] });
		const queue = coalesce([routine, monday, session], mutation('routine', 'delete', 'r1'));
		expect(queue).toHaveLength(1);
		expect(queue[0].payload.routineId).toBeNull();
	});

	test('keeps only the latest schedule change per day', () => {
		const first = mutation('schedule', 'set', 'mon', { routineId: 'r1' });
		const second = mutation('schedule', 'set', 'mon', { routineId: 'r2' });
		expect(coalesce([first], second)).toEqual([second]);
	});
});

describe('queue mutex', () => {
	test('runs tasks one at a time in order, even after a failure', async () => {
		const exclusive = createMutex();
		const log = [];
		const slow = exclusive(async () => {
			await new Promise((resolve) => setTimeout(resolve, 20));
			log.push('slow');
		});
		const failing = exclusive(async () => {
			log.push('failing');
			throw new Error('boom');
		});
		const fast = exclusive(async () => log.push('fast'));
		await slow;
		await expect(failing).rejects.toThrow('boom');
		await fast;
		expect(log).toEqual(['slow', 'failing', 'fast']);
	});
});
