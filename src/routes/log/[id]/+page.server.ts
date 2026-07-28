import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { api, ApiError } from '$lib/server/api';
import { lastPerformanceByExercise } from '$lib/utils/progression';
import { sessionInput } from '$lib/utils/sessionForm';
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

export const actions: Actions = {
	update: async ({ request, params, cookies }) => {
		try {
			await api(cookies, `/api/sessions/${params.id}`, {
				method: 'PUT',
				body: JSON.stringify(sessionInput(await request.formData()))
			});
		} catch (cause) {
			if (cause instanceof ApiError) return fail(cause.status, { error: cause.message });
			throw cause;
		}
		throw redirect(303, '/');
	},

	delete: async ({ params, cookies }) => {
		try {
			await api(cookies, `/api/sessions/${params.id}`, { method: 'DELETE' });
		} catch (cause) {
			if (cause instanceof ApiError) return fail(cause.status, { error: cause.message });
			throw cause;
		}
		throw redirect(303, '/');
	}
};
