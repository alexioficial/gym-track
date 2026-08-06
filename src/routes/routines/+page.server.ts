import type { PageServerLoad } from './$types';
import { api } from '$lib/server/api';
import { type Exercise, type Routine, type Schedule } from '$lib/types';

export const load: PageServerLoad = async ({ cookies }) => {
	const [routines, exercises, schedule] = await Promise.all([
		api<Routine[]>(cookies, '/api/routines'),
		api<Exercise[]>(cookies, '/api/exercises'),
		api<Schedule>(cookies, '/api/schedule')
	]);
	return { routines, exercises, schedule };
};
