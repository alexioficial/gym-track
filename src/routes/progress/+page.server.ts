import type { PageServerLoad } from './$types';
import { getExercises, getSessions } from '$lib/server/repo';
import { buildExerciseProgress } from '$lib/utils/progression';

export const load: PageServerLoad = async () => {
	const [exercises, sessions] = await Promise.all([getExercises(), getSessions()]);
	const progress = buildExerciseProgress(sessions, exercises);

	const tracked = progress
		.filter((p) => p.weeks.length > 0)
		.sort((a, b) => {
			const aw = a.latest?.weekKey ?? '';
			const bw = b.latest?.weekKey ?? '';
			if (aw !== bw) return aw < bw ? 1 : -1;
			return a.exercise.name.localeCompare(b.exercise.name);
		});

	const untracked = progress.filter((p) => p.weeks.length === 0).map((p) => p.exercise);

	return { tracked, untracked };
};
