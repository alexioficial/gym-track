import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	deleteSession,
	getExercises,
	getRoutines,
	getSession,
	updateSession
} from '$lib/server/repo';
import { parseSessionForm } from '$lib/server/parseSession';

export const load: PageServerLoad = async ({ params }) => {
	const [session, exercises, routines] = await Promise.all([
		getSession(params.id),
		getExercises(),
		getRoutines()
	]);
	if (!session) throw error(404, 'Sesión no encontrada');
	return { session, exercises, routines };
};

export const actions: Actions = {
	update: async ({ request, params }) => {
		const parsed = parseSessionForm(await request.formData());
		if (!parsed.date) return fail(400, { error: 'Falta la fecha' });
		if (parsed.entries.length === 0) return fail(400, { error: 'Añade al menos un ejercicio con reps' });
		await updateSession(params.id, parsed);
		throw redirect(303, '/');
	},

	delete: async ({ params }) => {
		await deleteSession(params.id);
		throw redirect(303, '/');
	}
};
