import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createExercise,
	deleteExercise,
	getExercises,
	updateExercise
} from '$lib/server/repo';

export const load: PageServerLoad = async () => {
	return { exercises: await getExercises() };
};

function parse(data: FormData) {
	return {
		name: String(data.get('name') ?? '').trim(),
		muscleGroup: String(data.get('muscleGroup') ?? '').trim(),
		notes: String(data.get('notes') ?? '').trim()
	};
}

export const actions: Actions = {
	create: async ({ request }) => {
		const { name, muscleGroup, notes } = parse(await request.formData());
		if (!name) return fail(400, { error: 'El nombre es obligatorio' });
		await createExercise({ name, muscleGroup, notes: notes || undefined });
		return { success: true };
	},

	update: async ({ request }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const { name, muscleGroup, notes } = parse(data);
		if (!id) return fail(400, { error: 'Falta el id' });
		if (!name) return fail(400, { error: 'El nombre es obligatorio' });
		await updateExercise(id, { name, muscleGroup, notes: notes || undefined });
		return { success: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		if (id) await deleteExercise(id);
		return { success: true };
	}
};
