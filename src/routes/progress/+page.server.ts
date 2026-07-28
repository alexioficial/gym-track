import type { PageServerLoad } from './$types';
import { api } from '$lib/server/api';
import {
	buildExerciseProgress,
	buildWeeklyRecap,
	groupProgressByRoutine
} from '$lib/utils/progression';
import type { Exercise, Routine, Session } from '$lib/types';

export const load: PageServerLoad = async ({ cookies }) => {
	const [exercises, routines, sessions] = await Promise.all([
		api<Exercise[]>(cookies, '/api/exercises'),
		api<Routine[]>(cookies, '/api/routines'),
		api<Session[]>(cookies, '/api/sessions')
	]);
	const progress = buildExerciseProgress(sessions, exercises);
	return {
		groups: groupProgressByRoutine(progress, routines),
		recap: buildWeeklyRecap(progress),
		untracked: progress.filter((item) => item.weeks.length === 0).map((item) => item.exercise)
	};
};
