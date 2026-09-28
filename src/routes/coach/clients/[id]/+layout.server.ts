import type { LayoutServerLoad } from './$types';
import { pageApi } from '$lib/server/api';
import type { CoachClient } from '$lib/coach';

export const load: LayoutServerLoad = async ({ cookies, params }) => {
	return { detail: await pageApi<CoachClient>(cookies, `/api/coach/clients/${params.id}`) };
};
