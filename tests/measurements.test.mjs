import { describe, expect, test } from 'bun:test';
import { knownMeasurementNames, measurementSeries, seriesChange } from '../src/lib/measurements.ts';
import { displayLength, toStoredCm } from '../src/lib/units.ts';

const record = (id, date, fields, createdAt = 0) => ({
	id,
	date,
	items: [],
	photos: [],
	createdAt,
	...fields
});

describe('body measurements', () => {
	const data = [
		record('b', '2026-09-20', { bodyWeight: 180, items: [{ name: 'cintura ', value: 84 }] }),
		record('a', '2026-09-01', {
			bodyWeight: 185,
			bodyFat: 20,
			items: [
				{ name: 'Cintura', value: 86 },
				{ name: 'Brazo', value: 35 }
			]
		}),
		record('c', '2026-09-20', { bodyWeight: 179.5 }, 5)
	];

	test('groups named measurements regardless of spacing and case', () => {
		const series = measurementSeries(data);
		expect(series.map((item) => item.label)).toEqual([
			'Peso corporal',
			'Grasa corporal',
			'cintura',
			'Brazo'
		]);
		const waist = series.find((item) => item.label === 'cintura');
		expect(waist.points).toEqual([
			{ date: '2026-09-01', value: 86 },
			{ date: '2026-09-20', value: 84 }
		]);
	});

	test('the later record of a day wins and changes are computed', () => {
		const weight = measurementSeries(data)[0];
		expect(weight.points.map((point) => point.value)).toEqual([185, 179.5]);
		expect(seriesChange(weight)).toEqual({
			latest: { date: '2026-09-20', value: 179.5 },
			sincePrevious: -5.5,
			sinceFirst: -5.5
		});
		const fat = measurementSeries(data)[1];
		expect(seriesChange(fat).sincePrevious).toBeNull();
	});

	test('suggests names used before, newest spelling first', () => {
		expect(knownMeasurementNames(data)).toEqual(['cintura', 'Brazo']);
	});

	test('converts lengths', () => {
		expect(toStoredCm(32.5, 'in')).toBe(82.55);
		expect(displayLength(82.55, 'in')).toBe(32.5);
		expect(displayLength(82.55, 'cm')).toBe(82.6);
	});
});
