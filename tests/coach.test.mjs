import { describe, expect, test } from 'bun:test';
import { clientActivity, lastSessionLabel, rosterSummary, sortClients } from '../src/lib/coach.ts';

const client = (username, lastSessionDate, recentSessionDates = []) => ({
	id: username,
	username,
	disabled: false,
	createdAt: '',
	lastSessionDate,
	recentSessionDates
});

describe('coach client list', () => {
	// 2026-09-30 is a Wednesday; its week runs Mon 28 to Sun 4.
	const today = '2026-09-30';

	test('counts this week and days since the last session', () => {
		const activity = clientActivity(
			client('ana', '2026-09-29', ['2026-09-29', '2026-09-28', '2026-09-27']),
			today
		);
		expect(activity).toEqual({ daysSince: 1, sessionsThisWeek: 2, inactive: false });
		expect(lastSessionLabel(activity)).toBe('Entrenó ayer');
	});

	test('flags a week without training and clients who never trained', () => {
		expect(clientActivity(client('beto', '2026-09-23'), today).inactive).toBe(true);
		expect(clientActivity(client('beto', '2026-09-24'), today).inactive).toBe(false);
		const never = clientActivity(client('ceci', undefined), today);
		expect(never).toEqual({ daysSince: null, sessionsThisWeek: 0, inactive: true });
		expect(lastSessionLabel(never)).toBe('Nunca ha entrenado');
	});

	test('puts the clients who need attention first', () => {
		const sorted = sortClients(
			[
				client('zoe', '2026-09-29'),
				client('ana', '2026-09-10'),
				client('memo', undefined),
				client('bea', '2026-09-20')
			],
			today
		);
		expect(sorted.map((item) => item.username)).toEqual(['memo', 'ana', 'bea', 'zoe']);
	});

	test('summarises from the local copy, including offline sessions', () => {
		const summary = rosterSummary({
			client: client('dani', '2026-09-01', []),
			snapshot: {
				exercises: [],
				routines: [],
				schedule: {},
				sessions: [
					{ id: '1', date: '2026-09-28', routineId: null, entries: [] },
					{ id: '2', date: '2026-09-30', routineId: null, entries: [] }
				]
			}
		});
		expect(summary.lastSessionDate).toBe('2026-09-30');
		expect(clientActivity(summary, today).sessionsThisWeek).toBe(2);
	});
});
