import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { api, ApiError } from '$lib/server/api';
import type { Exercise } from '$lib/types';

export const load: PageServerLoad = async ({ cookies }) => {
	return { exercises: await api<Exercise[]>(cookies, '/api/exercises') };
};

function parse(data: FormData) {
	return {
		name: String(data.get('name') ?? '').trim(),
		muscleGroup: String(data.get('muscleGroup') ?? '').trim(),
		notes: String(data.get('notes') ?? '').trim()
	};
}

function apiFailure(error: unknown) {
	if (error instanceof ApiError) return fail(error.status, { error: error.message });
	throw error;
}

export const actions: Actions = {
	create: async ({ request, cookies }) => {
		const { name, muscleGroup, notes } = parse(await request.formData());
		if (!name) return fail(400, { error: 'Name is required' });
		try {
			await api(cookies, '/api/exercises', {
				method: 'POST',
				body: JSON.stringify({ name, muscleGroup, notes: notes || undefined })
			});
		} catch (error) {
			return apiFailure(error);
		}
		return { success: true };
	},

	update: async ({ request, cookies }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const { name, muscleGroup, notes } = parse(data);
		if (!id) return fail(400, { error: 'Missing id' });
		if (!name) return fail(400, { error: 'Name is required' });
		try {
			await api(cookies, `/api/exercises/${id}`, {
				method: 'PUT',
				body: JSON.stringify({ name, muscleGroup, notes: notes || undefined })
			});
		} catch (error) {
			return apiFailure(error);
		}
		return { success: true };
	},

	delete: async ({ request, cookies }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		if (id) {
			try {
				await api(cookies, `/api/exercises/${id}`, { method: 'DELETE' });
			} catch (error) {
				return apiFailure(error);
			}
		}
		return { success: true };
	}
};
