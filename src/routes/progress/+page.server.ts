import type { PageServerLoad } from './$types';
import { getExercises, getRoutines, getSessions } from '$lib/server/repo';
import { buildExerciseProgress, buildWeeklyRecap, groupProgressByRoutine } from '$lib/utils/progression';

export const load: PageServerLoad = async () => {
	const [exercises, routines, sessions] = await Promise.all([
		getExercises(),
		getRoutines(),
		getSessions()
	]);
	const progress = buildExerciseProgress(sessions, exercises);

	const groups = groupProgressByRoutine(progress, routines);
	const recap = buildWeeklyRecap(progress);
	const untracked = progress.filter((p) => p.weeks.length === 0).map((p) => p.exercise);

	return { groups, recap, untracked };
};
