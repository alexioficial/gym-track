import type { PageServerLoad } from './$types';
import { pageApi } from '$lib/server/api';
import type { CoachClients } from '$lib/coach';

export const load: PageServerLoad = async ({ cookies }) => {
	return { roster: await pageApi<CoachClients>(cookies, '/api/coach/clients') };
};
