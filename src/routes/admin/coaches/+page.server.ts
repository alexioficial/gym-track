import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { pageApi } from '$lib/server/api';
import type { Coach } from '$lib/owner';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	if (!locals.user?.isAdmin) throw error(403, 'Solo para administradores');
	return { coaches: await pageApi<Coach[]>(cookies, '/api/owner/coaches') };
};
