import type { Measurement } from './types';

export type SeriesKind = 'weight' | 'length' | 'percent';

export interface MeasurementPoint {
	date: string;
	/** Stored value: pounds, centimetres or percent. */
	value: number;
}

export interface MeasurementSeries {
	key: string;
	label: string;
	kind: SeriesKind;
	/** Oldest first. */
	points: MeasurementPoint[];
}

/** Names are free text, so "Cintura" and " cintura " are the same measurement. */
export function measurementKey(name: string): string {
	return name.trim().toLocaleLowerCase('es').replace(/\s+/g, ' ');
}

const oldestFirst = (a: Measurement, b: Measurement) =>
	a.date.localeCompare(b.date) || a.createdAt - b.createdAt;

/**
 * One series per tracked value. Body weight, body fat and height come first;
 * named measurements follow in the order they were first recorded. A name keeps
 * the spelling of its latest record. Two records on the same day keep the later.
 */
export function measurementSeries(measurements: Measurement[]): MeasurementSeries[] {
	const fixed: MeasurementSeries[] = [
		{ key: 'bodyWeight', label: 'Peso corporal', kind: 'weight', points: [] },
		{ key: 'bodyFat', label: 'Grasa corporal', kind: 'percent', points: [] },
		{ key: 'height', label: 'Altura', kind: 'length', points: [] }
	];
	const named = new Map<string, MeasurementSeries>();
	const push = (series: MeasurementSeries, date: string, value: number) => {
		const last = series.points.at(-1);
		if (last?.date === date) last.value = value;
		else series.points.push({ date, value });
	};

	for (const measurement of [...measurements].sort(oldestFirst)) {
		if (measurement.bodyWeight != null) push(fixed[0], measurement.date, measurement.bodyWeight);
		if (measurement.bodyFat != null) push(fixed[1], measurement.date, measurement.bodyFat);
		if (measurement.height != null) push(fixed[2], measurement.date, measurement.height);
		for (const item of measurement.items) {
			const key = `item:${measurementKey(item.name)}`;
			let series = named.get(key);
			if (!series) {
				series = { key, label: item.name.trim(), kind: 'length', points: [] };
				named.set(key, series);
			}
			series.label = item.name.trim();
			push(series, measurement.date, item.value);
		}
	}
	return [...fixed, ...named.values()].filter((series) => series.points.length > 0);
}

/** Names used before, most recent first, for the form's suggestions. */
export function knownMeasurementNames(measurements: Measurement[]): string[] {
	const seen = new Map<string, string>();
	for (const measurement of [...measurements].sort(oldestFirst).reverse()) {
		for (const item of measurement.items) {
			const key = measurementKey(item.name);
			if (!seen.has(key)) seen.set(key, item.name.trim());
		}
	}
	return [...seen.values()];
}

/** Change since the previous record and since the first one, in stored units. */
export function seriesChange(series: MeasurementSeries) {
	const points = series.points;
	const latest = points.at(-1)!;
	const previous = points.length > 1 ? points.at(-2)! : null;
	return {
		latest,
		sincePrevious: previous ? latest.value - previous.value : null,
		sinceFirst: points.length > 1 ? latest.value - points[0].value : null
	};
}
