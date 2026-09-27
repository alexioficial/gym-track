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
	if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return 'Enter a valid session date';
	const year = Number(input.date.slice(0, 4));
	if (year < 1900 || year > 2100) return 'Enter a valid session date';
	if (input.entries.length === 0) return 'Add at least one set with reps';
	if (input.entries.length > MAX_SESSION_ENTRIES)
		return `A session can have at most ${MAX_SESSION_ENTRIES} exercises`;
	if ((input.notes ?? '').trim().length > NOTES_MAX)
		return `Notes can be at most ${NOTES_MAX} characters`;
	for (const entry of input.entries) {
		if (entry.sets.length > MAX_SETS_PER_ENTRY)
			return `An exercise can have at most ${MAX_SETS_PER_ENTRY} sets`;
		for (const set of entry.sets) {
			if (!Number.isFinite(set.weight) || set.weight < 0 || set.weight > MAX_WEIGHT)
				return `Weight must be between 0 and ${MAX_WEIGHT}`;
			if (!Number.isFinite(set.reps) || set.reps <= 0 || set.reps > MAX_REPS)
				return `Reps must be more than 0 and at most ${MAX_REPS}`;
		}
	}
	return null;
}
