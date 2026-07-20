import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createRoutine,
	deleteRoutine,
	getExercises,
	getRoutines,
	getSchedule,
	setScheduleDay,
	updateRoutine
} from '$lib/server/repo';
import { ROUTINE_COLORS, WEEKDAYS, type Weekday } from '$lib/types';

export const load: PageServerLoad = async () => {
	const [routines, exercises, schedule] = await Promise.all([
		getRoutines(),
		getExercises(),
		getSchedule()
	]);
	return { routines, exercises, schedule };
};

function safeColor(value: string): string {
	return (ROUTINE_COLORS as readonly string[]).includes(value) ? value : ROUTINE_COLORS[0];
}

export const actions: Actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const color = safeColor(String(data.get('color') ?? ''));
		const exerciseIds = data.getAll('exerciseIds').map(String);
		if (!name) return fail(400, { error: 'El nombre es obligatorio' });
		await createRoutine({ name, color, exerciseIds });
		return { success: true };
	},

	update: async ({ request }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const name = String(data.get('name') ?? '').trim();
		const color = safeColor(String(data.get('color') ?? ''));
		const exerciseIds = data.getAll('exerciseIds').map(String);
		if (!id) return fail(400, { error: 'Falta el id' });
		if (!name) return fail(400, { error: 'El nombre es obligatorio' });
		await updateRoutine(id, { name, color, exerciseIds });
		return { success: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		if (id) await deleteRoutine(id);
		return { success: true };
	},

	setDay: async ({ request }) => {
		const data = await request.formData();
		const day = String(data.get('day') ?? '') as Weekday;
		const routineId = String(data.get('routineId') ?? '');
		if (!WEEKDAYS.includes(day)) return fail(400, { error: 'Día inválido' });
		await setScheduleDay(day, routineId || null);
		return { success: true };
	}
};
