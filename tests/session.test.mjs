import { describe, expect, test } from 'bun:test';
import { sessionInput } from '../src/lib/utils/sessionForm.ts';

function formFor(entries, date = '2026-07-28') {
	const form = new FormData();
	form.set('date', date);
	form.set('entries', JSON.stringify(entries));
	return form;
}

describe('session form request mapping', () => {
	test('preserves form values for authoritative API validation', () => {
		const parsed = sessionInput(
			formFor([{ exerciseId: '507f1f77bcf86cd799439011', sets: [{ weight: 135, reps: 5.55 }] }])
		);

		expect(parsed).toEqual({
			date: '2026-07-28',
			routineId: null,
			notes: undefined,
			entries: [{ exerciseId: '507f1f77bcf86cd799439011', sets: [{ weight: 135, reps: 5.55 }] }]
		});
	});

	test('turns malformed entry JSON into an empty API payload', () => {
		const form = new FormData();
		form.set('date', '2026-07-28');
		form.set('entries', '{bad JSON');
		expect(sessionInput(form).entries).toEqual([]);
	});
});
