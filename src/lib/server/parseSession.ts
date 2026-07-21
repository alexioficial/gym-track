import type { SessionEntry } from '$lib/types';

/** Parses and sanitizes the SessionForm FormData (entries comes as JSON). */
export function parseSessionForm(data: FormData): {
	date: string;
	routineId: string | null;
	notes?: string;
	entries: SessionEntry[];
} {
	const date = String(data.get('date') ?? '').trim();
	const routineId = String(data.get('routineId') ?? '') || null;
	const notes = String(data.get('notes') ?? '').trim();

	let entries: SessionEntry[] = [];
	try {
		const raw: unknown = JSON.parse(String(data.get('entries') ?? '[]'));
		if (Array.isArray(raw)) {
			entries = raw.map((e) => {
				const obj = e as { exerciseId?: unknown; sets?: unknown };
				const sets = Array.isArray(obj.sets)
					? obj.sets.map((s) => {
							const so = s as { weight?: unknown; reps?: unknown };
							return {
								weight: Math.max(0, Number(so.weight) || 0),
								// Reps allow one decimal so a partial "half rep" can be logged (e.g. 5.5).
								reps: Math.max(0, Math.round((Number(so.reps) || 0) * 10) / 10)
							};
						})
					: [];
				return { exerciseId: String(obj.exerciseId ?? ''), sets };
			});
		}
	} catch {
		entries = [];
	}

	return { date, routineId, notes: notes || undefined, entries };
}
