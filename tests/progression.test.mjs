import { describe, expect, test } from 'bun:test';
import {
	isoWeekKey,
	lastPerformanceByExercise,
	newestSessionFirst,
	weeklyStatsForExercise
} from '../src/lib/utils/progression.ts';

describe('progression calculations', () => {
	test('uses ISO weeks across a year boundary', () => {
		expect(isoWeekKey('2024-12-30')).toBe('2025-W01');
	});

	test('aggregates all valid sets for an exercise in the same week', () => {
		const weeks = weeklyStatsForExercise(
			[
				{
					id: 'one',
					date: '2026-07-20',
					routineId: null,
					entries: [{ exerciseId: 'squat', sets: [{ weight: 100, reps: 5 }] }]
				},
				{
					id: 'two',
					date: '2026-07-22',
					routineId: null,
					entries: [{ exerciseId: 'squat', sets: [{ weight: 110, reps: 3 }] }]
				}
			],
			'squat'
		);

		expect(weeks).toHaveLength(1);
		expect(weeks[0]).toMatchObject({ topWeight: 110, topReps: 3, totalVolume: 830, totalSets: 2 });
	});

	test('sorts same-day sessions by creation time', () => {
		const sessions = [
			{ id: 'older', date: '2026-08-07', createdAt: 100, routineId: null, entries: [] },
			{ id: 'newer', date: '2026-08-07', createdAt: 200, routineId: null, entries: [] }
		];

		expect(sessions.sort(newestSessionFirst).map((session) => session.id)).toEqual([
			'newer',
			'older'
		]);
	});

	test('aggregates repeated occurrences of an exercise within one session', () => {
		const weeks = weeklyStatsForExercise(
			[
				{
					id: 'session',
					date: '2026-08-17',
					routineId: 'routine',
					entries: [
						{ exerciseId: 'squat', sets: [{ weight: 100, reps: 5 }] },
						{ exerciseId: 'row', sets: [{ weight: 50, reps: 10 }] },
						{ exerciseId: 'squat', sets: [{ weight: 80, reps: 8 }] }
					]
				}
			],
			'squat'
		);

		expect(weeks[0]).toMatchObject({ totalSets: 2, totalReps: 13, totalVolume: 1140 });
	});

	test('uses every repeated occurrence as the last-performance reference', () => {
		const latest = lastPerformanceByExercise([
			{
				id: 'session',
				date: '2026-08-17',
				routineId: null,
				entries: [
					{ exerciseId: 'squat', sets: [{ weight: 100, reps: 5 }] },
					{ exerciseId: 'squat', sets: [{ weight: 80, reps: 8 }] }
				]
			}
		]);

		expect(latest.squat.sets).toHaveLength(2);
	});
});
