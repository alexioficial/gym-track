import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	deleteSession,
	getExercises,
	getRoutines,
	getSession,
	getSessions,
	updateSession
} from '$lib/server/repo';
import { parseSessionForm } from '$lib/server/parseSession';
import { lastPerformanceByExercise } from '$lib/utils/progression';

export const load: PageServerLoad = async ({ params }) => {
	const [session, exercises, routines, sessions] = await Promise.all([
		getSession(params.id),
		getExercises(),
		getRoutines(),
		getSessions()
	]);
	if (!session) throw error(404, 'Session not found');
	// Reference the previous time each exercise was done — not this session itself,
	// and nothing logged after it.
	const lastByExercise = lastPerformanceByExercise(sessions, {
		excludeSessionId: session.id,
		onOrBefore: session.date
	});
	return { session, exercises, routines, lastByExercise };
};

export const actions: Actions = {
	update: async ({ request, params }) => {
		const parsed = parseSessionForm(await request.formData());
		if (!parsed.date) return fail(400, { error: 'Date is required' });
		if (parsed.entries.length === 0) return fail(400, { error: 'Add at least one exercise with reps' });
		await updateSession(params.id, parsed);
		throw redirect(303, '/');
	},

	delete: async ({ params }) => {
		await deleteSession(params.id);
		throw redirect(303, '/');
	}
};
