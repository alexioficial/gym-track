import type { SessionEntry } from '$lib/types';

/** Converts SessionForm data into an API request. The API validates all values. */
export function sessionInput(data: FormData): {
	date: string;
	routineId: string | null;
	notes?: string;
	entries: SessionEntry[];
} {
	let entries: SessionEntry[] = [];
	try {
		const value: unknown = JSON.parse(String(data.get('entries') ?? '[]'));
		if (Array.isArray(value)) entries = value as SessionEntry[];
	} catch {
		// Invalid JSON becomes an empty list and receives the API's normal 400 response.
	}
	const notes = String(data.get('notes') ?? '').trim();
	return {
		date: String(data.get('date') ?? '').trim(),
		routineId: String(data.get('routineId') ?? '') || null,
		notes: notes || undefined,
		entries
	};
}
