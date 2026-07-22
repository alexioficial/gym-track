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
import {
	DEFAULT_ROUTINE_SETS,
	ROUTINE_COLORS,
	WEEKDAYS,
	type RoutineExercise,
	type Weekday
} from '$lib/types';

export const load: PageServerLoad = async ({ locals }) => {
	const uid = locals.user!.id;
	const [routines, exercises, schedule] = await Promise.all([
		getRoutines(uid),
		getExercises(uid),
		getSchedule(uid)
	]);
	return { routines, exercises, schedule };
};

function safeColor(value: string): string {
	return (ROUTINE_COLORS as readonly string[]).includes(value) ? value : ROUTINE_COLORS[0];
}

function parseExercises(raw: FormDataEntryValue | null): RoutineExercise[] {
	try {
		const arr = JSON.parse(String(raw ?? '[]'));
		if (!Array.isArray(arr)) return [];
		return arr
			.filter((x) => x && typeof x.exerciseId === 'string')
			.map((x) => ({ exerciseId: x.exerciseId as string, sets: Number(x.sets) || DEFAULT_ROUTINE_SETS }));
	} catch {
		return [];
	}
}

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const color = safeColor(String(data.get('color') ?? ''));
		const exercises = parseExercises(data.get('exercises'));
		if (!name) return fail(400, { error: 'Name is required' });
		await createRoutine(locals.user!.id, { name, color, exercises });
		return { success: true };
	},

	update: async ({ request, locals }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const name = String(data.get('name') ?? '').trim();
		const color = safeColor(String(data.get('color') ?? ''));
		const exercises = parseExercises(data.get('exercises'));
		if (!id) return fail(400, { error: 'Missing id' });
		if (!name) return fail(400, { error: 'Name is required' });
		await updateRoutine(locals.user!.id, id, { name, color, exercises });
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		if (id) await deleteRoutine(locals.user!.id, id);
		return { success: true };
	},

	setDay: async ({ request, locals }) => {
		const data = await request.formData();
		const day = String(data.get('day') ?? '') as Weekday;
		const routineId = String(data.get('routineId') ?? '');
		if (!WEEKDAYS.includes(day)) return fail(400, { error: 'Invalid day' });
		await setScheduleDay(locals.user!.id, day, routineId || null);
		return { success: true };
	}
};
