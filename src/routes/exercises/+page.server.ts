import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createExercise,
	deleteExercise,
	getExercises,
	updateExercise
} from '$lib/server/repo';

export const load: PageServerLoad = async ({ locals }) => {
	return { exercises: await getExercises(locals.user!.id) };
};

function parse(data: FormData) {
	return {
		name: String(data.get('name') ?? '').trim(),
		muscleGroup: String(data.get('muscleGroup') ?? '').trim(),
		notes: String(data.get('notes') ?? '').trim()
	};
}

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const { name, muscleGroup, notes } = parse(await request.formData());
		if (!name) return fail(400, { error: 'Name is required' });
		await createExercise(locals.user!.id, { name, muscleGroup, notes: notes || undefined });
		return { success: true };
	},

	update: async ({ request, locals }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const { name, muscleGroup, notes } = parse(data);
		if (!id) return fail(400, { error: 'Missing id' });
		if (!name) return fail(400, { error: 'Name is required' });
		await updateExercise(locals.user!.id, id, { name, muscleGroup, notes: notes || undefined });
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		if (id) await deleteExercise(locals.user!.id, id);
		return { success: true };
	}
};
