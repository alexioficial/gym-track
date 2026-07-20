import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getExercise, getSessions } from '$lib/server/repo';
import { weekOverWeekDelta, weeklyStatsForExercise } from '$lib/utils/progression';

export const load: PageServerLoad = async ({ params }) => {
	const [exercise, sessions] = await Promise.all([
		getExercise(params.exerciseId),
		getSessions()
	]);
	if (!exercise) throw error(404, 'Exercise not found');

	const weeks = weeklyStatsForExercise(sessions, exercise.id);
	const latest = weeks.length > 0 ? weeks[weeks.length - 1] : null;
	const previous = weeks.length >= 2 ? weeks[weeks.length - 2] : null;
	const delta = latest ? weekOverWeekDelta(previous, latest) : null;

	return { exercise, weeks, latest, previous, delta };
};
