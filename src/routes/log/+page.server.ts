import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { api, ApiError } from '$lib/server/api';
import { lastPerformanceByExercise } from '$lib/utils/progression';
import { sessionInput } from '$lib/utils/sessionForm';
import type { Exercise, Routine, Session } from '$lib/types';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const [exercises, routines, sessions] = await Promise.all([
		api<Exercise[]>(cookies, '/api/exercises'),
		api<Routine[]>(cookies, '/api/routines'),
		api<Session[]>(cookies, '/api/sessions')
	]);
	const routineById = new Map(routines.map((routine) => [routine.id, routine]));
	const history = sessions.slice(0, 12).map((session) => {
		const routine = session.routineId ? routineById.get(session.routineId) : null;
		return {
			id: session.id,
			date: session.date,
			routineName: routine?.name ?? null,
			routineColor: routine?.color ?? null,
			exerciseCount: session.entries.length,
			setCount: session.entries.reduce((count, entry) => count + entry.sets.length, 0)
		};
	});
	return {
		exercises,
		routines,
		initialRoutineId: url.searchParams.get('routine') ?? '',
		history,
		lastByExercise: lastPerformanceByExercise(sessions)
	};
};

export const actions: Actions = {
	create: async ({ request, cookies }) => {
		try {
			await api(cookies, '/api/sessions', {
				method: 'POST',
				body: JSON.stringify(sessionInput(await request.formData()))
			});
		} catch (error) {
			if (error instanceof ApiError) return fail(error.status, { error: error.message });
			throw error;
		}
		throw redirect(303, '/');
	}
};
