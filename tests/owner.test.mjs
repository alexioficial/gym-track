import { describe, expect, test } from 'bun:test';
import { addDays, addMonths, paymentAgenda, paymentPeriod } from '../src/lib/owner.ts';

const coach = (username, paidUntil, suspended = false) => ({
	id: username,
	username,
	plan: 'basic',
	maxClients: 10,
	paidUntil,
	suspended,
	status: 'active',
	activeClients: 0,
	createdAt: ''
});

describe('owner panel', () => {
	test('date helpers cross months and clamp short ones', () => {
		expect(addDays('2026-09-28', 7)).toBe('2026-10-05');
		expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
		expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
	});

	test('lists overdue coaches and those due within a week', () => {
		const agenda = paymentAgenda(
			[
				coach('late', '2026-09-20'),
				coach('soon', '2026-10-02'),
				coach('today', '2026-09-28'),
				coach('later', '2026-11-01'),
				coach('off', '2026-09-01', true)
			],
			'2026-09-28'
		);
		expect(agenda.overdue.map((c) => c.username)).toEqual(['late']);
		expect(agenda.dueSoon.map((c) => c.username)).toEqual(['today', 'soon']);
	});
});

describe('payment period', () => {
	test('matches the API rules', () => {
		expect(paymentPeriod('2026-10-14', '2026-10-10', 1)).toEqual({
			start: '2026-10-15',
			end: '2026-11-14',
			paidUntil: '2026-11-14'
		});
		expect(paymentPeriod('2026-10-14', '2026-10-20', 3).end).toBe('2027-01-14');
		expect(paymentPeriod('2026-10-14', '2026-12-01', 1).start).toBe('2026-12-01');
		expect(paymentPeriod(null, '2026-01-31', 1).end).toBe('2026-02-27');
	});
});
