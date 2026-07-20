import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSession, getExercises, getRoutines, getSessions } from '$lib/server/repo';
import { parseSessionForm } from '$lib/server/parseSession';

export const load: PageServerLoad = async ({ url }) => {
	const [exercises, routines, sessions] = await Promise.all([
		getExercises(),
		getRoutines(),
		getSessions()
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
		history
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const parsed = parseSessionForm(await request.formData());
		if (!parsed.date) return fail(400, { error: 'Date is required' });
		if (parsed.entries.length === 0) return fail(400, { error: 'Add at least one exercise with reps' });
		await createSession(parsed);
		throw redirect(303, '/');
	}
};
