import { describe, expect, test } from 'bun:test';
import {
	displayLoad,
	displayStat,
	formatLoad,
	storedWeight,
	toStoredLb,
	weightField
} from '../src/lib/units.ts';

describe('weight units', () => {
	test('stores kilograms as pounds with 2 decimals', () => {
		expect(toStoredLb(100, 'kg')).toBe(220.46);
		expect(toStoredLb(135, 'lb')).toBe(135);
	});

	test('values typed in a unit come back exactly', () => {
		for (const kg of [100, 61.25, 20, 2.5, 1.25, 102.5, 0.5, 12]) {
			expect(displayLoad(toStoredLb(kg, 'kg'), 'kg')).toEqual({ value: kg, approx: false });
		}
		expect(displayLoad(135, 'lb')).toEqual({ value: 135, approx: false });
		expect(displayLoad(62.5, 'lb')).toEqual({ value: 62.5, approx: false });
	});

	test('values typed in the other unit round to a loadable weight', () => {
		expect(displayLoad(135, 'kg')).toEqual({ value: 60, approx: true });
		expect(displayLoad(225, 'kg')).toEqual({ value: 102.5, approx: true });
		expect(displayLoad(45, 'kg')).toEqual({ value: 20, approx: true });
		expect(displayLoad(toStoredLb(100, 'kg'), 'lb')).toEqual({ value: 220, approx: true });
		expect(formatLoad(135, 'kg')).toBe('≈60');
		expect(formatLoad(135, 'lb')).toBe('135');
	});

	test('stats convert exactly with one decimal', () => {
		expect(displayStat(225, 'kg')).toBe(102.1);
		expect(displayStat(-5, 'kg')).toBe(-2.3);
		expect(displayStat(1350, 'lb')).toBe(1350);
	});

	test('an untouched field keeps the stored pounds', () => {
		const field = weightField(135, 'kg');
		expect(field.weight).toBe(60);
		expect(storedWeight(field, 'kg')).toBe(135);
		expect(storedWeight({ ...field, weight: 62.5 }, 'kg')).toBe(137.79);
		expect(storedWeight(weightField(null, 'kg'), 'kg')).toBe(0);
	});
});
