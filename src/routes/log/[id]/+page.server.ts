import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { api, ApiError } from '$lib/server/api';
import { lastPerformanceByExercise } from '$lib/utils/progression';
import type { Exercise, Routine, Session } from '$lib/types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	try {
		const [session, exercises, routines, sessions] = await Promise.all([
			api<Session>(cookies, `/api/sessions/${params.id}`),
			api<Exercise[]>(cookies, '/api/exercises'),
			api<Routine[]>(cookies, '/api/routines'),
			api<Session[]>(cookies, '/api/sessions')
		]);
		return {
			session,
			exercises,
			routines,
			lastByExercise: lastPerformanceByExercise(sessions, {
				excludeSessionId: session.id,
				onOrBefore: session.date
			})
		};
	} catch (cause) {
		if (cause instanceof ApiError && cause.status === 404) throw error(404, 'Session not found');
		throw cause;
	}
};
