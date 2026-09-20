import type { PageServerLoad } from './$types';
import { pageApi } from '$lib/server/api';
import { type Exercise, type Routine, type Schedule } from '$lib/types';

export const load: PageServerLoad = async ({ cookies }) => {
	const [routines, exercises, schedule] = await Promise.all([
		pageApi<Routine[]>(cookies, '/api/routines'),
		pageApi<Exercise[]>(cookies, '/api/exercises'),
		pageApi<Schedule>(cookies, '/api/schedule')
	]);
	return { routines, exercises, schedule };
};
