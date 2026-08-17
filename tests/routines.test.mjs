import { describe, expect, test } from 'bun:test';
import { duplicatedRoutineName } from '../src/lib/utils/routines.ts';

describe('routine duplication', () => {
	test('chooses the first available copy number', () => {
		expect(duplicatedRoutineName('Push', ['Push'])).toBe('Push (Copy)');
		expect(duplicatedRoutineName('Push', ['Push', 'Push (Copy)'])).toBe('Push (Copy 2)');
		expect(duplicatedRoutineName('Push (Copy 2)', ['Push', 'Push (Copy)', 'Push (Copy 2)'])).toBe(
			'Push (Copy 3)'
		);
	});

	test('keeps the duplicated name inside the API limit', () => {
		const name = duplicatedRoutineName('A'.repeat(100), []);
		expect(name.length).toBe(100);
		expect(name.endsWith(' (Copy)')).toBe(true);

		const emojiName = duplicatedRoutineName('🏋️'.repeat(100), []);
		expect(Array.from(emojiName).length).toBeLessThanOrEqual(100);
		expect(emojiName.endsWith(' (Copy)')).toBe(true);
	});
});
