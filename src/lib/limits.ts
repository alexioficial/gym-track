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
