import type { PageServerLoad } from './$types';
import { api } from '$lib/server/api';
import type { Exercise } from '$lib/types';

export const load: PageServerLoad = async ({ cookies }) => {
	return { exercises: await api<Exercise[]>(cookies, '/api/exercises') };
};
