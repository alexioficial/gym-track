import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { api, ApiError } from '$lib/server/api';
import {
	DEFAULT_ROUTINE_SETS,
	ROUTINE_COLORS,
	type Exercise,
	type Routine,
	type RoutineExercise,
	type Schedule,
	type Weekday
} from '$lib/types';

export const load: PageServerLoad = async ({ cookies }) => {
	const [routines, exercises, schedule] = await Promise.all([
		api<Routine[]>(cookies, '/api/routines'),
		api<Exercise[]>(cookies, '/api/exercises'),
		api<Schedule>(cookies, '/api/schedule')
	]);
	return { routines, exercises, schedule };
};

function safeColor(value: string): string {
	return (ROUTINE_COLORS as readonly string[]).includes(value) ? value : ROUTINE_COLORS[0];
}

function parseExercises(raw: FormDataEntryValue | null): RoutineExercise[] {
	try {
		const arr: unknown = JSON.parse(String(raw ?? '[]'));
		if (!Array.isArray(arr)) return [];
		return arr
			.filter((value): value is { exerciseId: string; sets?: unknown } =>
				Boolean(
					value &&
					typeof value === 'object' &&
					typeof (value as { exerciseId?: unknown }).exerciseId === 'string'
				)
			)
			.map((value) => ({
				exerciseId: value.exerciseId,
				sets: Number(value.sets) || DEFAULT_ROUTINE_SETS
			}));
	} catch {
		return [];
	}
}

function apiFailure(error: unknown) {
	if (error instanceof ApiError) return fail(error.status, { error: error.message });
	throw error;
}

export const actions: Actions = {
	create: async ({ request, cookies }) => {
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'Name is required' });
		try {
			await api(cookies, '/api/routines', {
				method: 'POST',
				body: JSON.stringify({
					name,
					color: safeColor(String(data.get('color') ?? '')),
					exercises: parseExercises(data.get('exercises'))
				})
			});
		} catch (error) {
			return apiFailure(error);
		}
		return { success: true };
	},

	update: async ({ request, cookies }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const name = String(data.get('name') ?? '').trim();
		if (!id) return fail(400, { error: 'Missing id' });
		if (!name) return fail(400, { error: 'Name is required' });
		try {
			await api(cookies, `/api/routines/${id}`, {
				method: 'PUT',
				body: JSON.stringify({
					name,
					color: safeColor(String(data.get('color') ?? '')),
					exercises: parseExercises(data.get('exercises'))
				})
			});
		} catch (error) {
			return apiFailure(error);
		}
		return { success: true };
	},

	delete: async ({ request, cookies }) => {
		const id = String((await request.formData()).get('id') ?? '');
		if (id) {
			try {
				await api(cookies, `/api/routines/${id}`, { method: 'DELETE' });
			} catch (error) {
				return apiFailure(error);
			}
		}
		return { success: true };
	},

	setDay: async ({ request, cookies }) => {
		const data = await request.formData();
		const day = String(data.get('day') ?? '') as Weekday;
		const routineId = String(data.get('routineId') ?? '') || null;
		try {
			await api(cookies, `/api/schedule/${day}`, {
				method: 'PUT',
				body: JSON.stringify({ routineId })
			});
		} catch (error) {
			return apiFailure(error);
		}
		return { success: true };
	}
};
