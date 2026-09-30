import { describe, expect, test } from 'bun:test';
import { coachSessionsOn, latestOwnSession } from '../src/lib/coach-log.ts';

const session = (id, date, loggedBy) => ({ id, date, routineId: null, entries: [], loggedBy });

describe('coach-logged sessions on the client side', () => {
	const sessions = [
		session('a', '2026-09-29', 'coach'),
		session('b', '2026-09-29'),
		session('c', '2026-09-28', 'coach'),
		session('d', '2026-09-27')
	];

	test('finds what the coach logged on a day, not the client’s own', () => {
		expect(coachSessionsOn(sessions, '2026-09-29').map((item) => item.id)).toEqual(['a']);
		expect(coachSessionsOn(sessions, '2026-09-27')).toEqual([]);
	});

	test('the last own session skips the coach’s', () => {
		expect(latestOwnSession(sessions)?.id).toBe('b');
		expect(latestOwnSession([sessions[0], sessions[2]])).toBeNull();
	});
});
