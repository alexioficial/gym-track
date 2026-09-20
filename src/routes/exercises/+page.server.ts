import type { PageServerLoad } from './$types';
import { pageApi } from '$lib/server/api';
import type { Exercise } from '$lib/types';

export const load: PageServerLoad = async ({ cookies }) => {
	return { exercises: await pageApi<Exercise[]>(cookies, '/api/exercises') };
};
