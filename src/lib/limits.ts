// Mirrors gym-tracker-api/src/validation.rs. A change the API rejects is dropped
// from the offline queue, so the forms must catch these before saving.
export const NAME_MAX = 100;
export const MUSCLE_GROUP_MAX = 80;
export const NOTES_MAX = 2000;
export const MAX_WEIGHT = 5000;
export const MAX_REPS = 1000;
export const MAX_SETS_PER_ENTRY = 20;
export const MAX_SESSION_ENTRIES = 50;
export const MAX_ROUTINE_EXERCISES = 50;
export const MAX_ROUTINE_SETS = 10;
export const MEASUREMENT_ITEMS_MAX = 30;
export const MEASUREMENT_NAME_MAX = 60;
/** Centimetres; also bounds height. */
export const MAX_LENGTH_CM = 300;
/** Pounds. */
export const MAX_BODY_WEIGHT = 1500;
export const MEASUREMENT_PHOTOS_MAX = 6;

export interface SessionInput {
	date: string;
	notes?: string;
	entries: Array<{ sets: Array<{ weight: number; reps: number }> }>;
}

/** Returns a user-facing reason the API would reject this session, or null. */
export function sessionProblem(input: SessionInput): string | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return 'Introduce una fecha válida';
	const year = Number(input.date.slice(0, 4));
	if (year < 1900 || year > 2100) return 'Introduce una fecha válida';
	if (input.entries.length === 0) return 'Añade al menos una serie con repeticiones';
	if (input.entries.length > MAX_SESSION_ENTRIES)
		return `Una sesión puede tener como máximo ${MAX_SESSION_ENTRIES} ejercicios`;
	if ((input.notes ?? '').trim().length > NOTES_MAX)
		return `Las notas pueden tener como máximo ${NOTES_MAX} caracteres`;
	for (const entry of input.entries) {
		if (entry.sets.length > MAX_SETS_PER_ENTRY)
			return `Un ejercicio puede tener como máximo ${MAX_SETS_PER_ENTRY} series`;
		for (const set of entry.sets) {
			if (!Number.isFinite(set.weight) || set.weight < 0 || set.weight > MAX_WEIGHT)
				return `El peso debe estar entre 0 y ${MAX_WEIGHT} lb`;
			if (!Number.isFinite(set.reps) || set.reps <= 0 || set.reps > MAX_REPS)
				return `Las repeticiones deben ser más de 0 y como máximo ${MAX_REPS}`;
		}
	}
	return null;
}

export interface MeasurementPayload {
	date: string;
	bodyWeight: number | null;
	height: number | null;
	bodyFat: number | null;
	items: Array<{ name: string; value: number }>;
	photos: string[];
}

/** Returns a user-facing reason the API would reject this check-in, or null. */
export function measurementProblem(input: MeasurementPayload): string | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return 'Introduce una fecha válida';
	const empty =
		input.bodyWeight === null &&
		input.height === null &&
		input.bodyFat === null &&
		input.items.length === 0 &&
		input.photos.length === 0;
	if (empty) return 'Anota al menos una medida, el peso o una foto';
	const inRange = (value: number | null, max: number) =>
		value === null || (Number.isFinite(value) && value > 0 && value <= max);
	if (!inRange(input.bodyWeight, MAX_BODY_WEIGHT)) return 'Revisa el peso corporal';
	if (!inRange(input.height, MAX_LENGTH_CM)) return 'Revisa la altura';
	if (!inRange(input.bodyFat, 100)) return 'El % de grasa debe estar entre 0 y 100';
	if (input.items.length > MEASUREMENT_ITEMS_MAX)
		return `Como máximo ${MEASUREMENT_ITEMS_MAX} medidas por registro`;
	for (const item of input.items) {
		if (!item.name.trim()) return 'Ponle nombre a cada medida';
		if (item.name.trim().length > MEASUREMENT_NAME_MAX)
			return `Los nombres pueden tener como máximo ${MEASUREMENT_NAME_MAX} caracteres`;
		if (!inRange(item.value, MAX_LENGTH_CM)) return `Revisa el valor de «${item.name.trim()}»`;
	}
	if (input.photos.length > MEASUREMENT_PHOTOS_MAX)
		return `Como máximo ${MEASUREMENT_PHOTOS_MAX} fotos por registro`;
	return null;
}
