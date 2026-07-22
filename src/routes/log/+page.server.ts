import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSession, getExercises, getRoutines, getSessions } from '$lib/server/repo';
import { parseSessionForm } from '$lib/server/parseSession';
import { lastPerformanceByExercise } from '$lib/utils/progression';

export const load: PageServerLoad = async ({ url, locals }) => {
	const uid = locals.user!.id;
	const [exercises, routines, sessions] = await Promise.all([
		getExercises(uid),
		getRoutines(uid),
		getSessions(uid)
	]);

	const routineById = new Map(routines.map((r) => [r.id, r]));
	const history = sessions.slice(0, 12).map((s) => {
		const routine = s.routineId ? routineById.get(s.routineId) : null;
		return {
			id: s.id,
			date: s.date,
			routineName: routine?.name ?? null,
			routineColor: routine?.color ?? null,
			exerciseCount: s.entries.length,
			setCount: s.entries.reduce((acc, e) => acc + e.sets.length, 0)
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
	create: async ({ request, locals }) => {
		const parsed = parseSessionForm(await request.formData());
		if (!parsed.date) return fail(400, { error: 'Date is required' });
		if (parsed.entries.length === 0) return fail(400, { error: 'Add at least one exercise with reps' });
		await createSession(locals.user!.id, parsed);
		throw redirect(303, '/');
	}
};
