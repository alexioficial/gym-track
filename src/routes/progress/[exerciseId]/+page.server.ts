import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { api } from '$lib/server/api';
import { weekOverWeekDelta, weeklyStatsForExercise } from '$lib/utils/progression';
import type { Exercise, Session } from '$lib/types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const [exercises, sessions] = await Promise.all([
		api<Exercise[]>(cookies, '/api/exercises'),
		api<Session[]>(cookies, '/api/sessions')
	]);
	const exercise = exercises.find((item) => item.id === params.exerciseId);
	if (!exercise) throw error(404, 'Exercise not found');
	const weeks = weeklyStatsForExercise(sessions, exercise.id);
	const latest = weeks.length > 0 ? weeks[weeks.length - 1] : null;
	const previous = weeks.length >= 2 ? weeks[weeks.length - 2] : null;
	return {
		exercise,
		weeks,
		latest,
		previous,
		delta: latest ? weekOverWeekDelta(previous, latest) : null
	};
};
