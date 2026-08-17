const ROUTINE_NAME_MAX = 100;
const COPY_SUFFIX = /\s+\(Copy(?: \d+)?\)$/i;

/** Returns the first available, API-safe name for a duplicated routine. */
export function duplicatedRoutineName(source: string, existingNames: Iterable<string>): string {
	const used = new Set(Array.from(existingNames, (name) => name.trim().toLocaleLowerCase()));
	const base = source.trim().replace(COPY_SUFFIX, '').trim() || 'Routine';
	let number = 1;
	while (true) {
		const suffix = number === 1 ? ' (Copy)' : ` (Copy ${number})`;
		const prefix = Array.from(base)
			.slice(0, ROUTINE_NAME_MAX - suffix.length)
			.join('')
			.trimEnd();
		const candidate = `${prefix}${suffix}`;
		if (!used.has(candidate.toLocaleLowerCase())) return candidate;
		number += 1;
	}
}

/** Returns the planned occurrences that are not represented in the current ordered list. */
export function missingExerciseOccurrences<T extends { exerciseId: string }>(
	planned: readonly T[],
	present: readonly { exerciseId: string }[]
): T[] {
	const remaining = new Map<string, number>();
	for (const item of present) {
		remaining.set(item.exerciseId, (remaining.get(item.exerciseId) ?? 0) + 1);
	}
	return planned.filter((item) => {
		const count = remaining.get(item.exerciseId) ?? 0;
		if (count === 0) return true;
		remaining.set(item.exerciseId, count - 1);
		return false;
	});
}
