import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { pageApi } from '$lib/server/api';
import type { Coach, Payment } from '$lib/owner';

export const load: PageServerLoad = async ({ locals, cookies, params }) => {
	if (!locals.user?.isAdmin) throw error(403, 'Solo para administradores');
	const [coach, payments] = await Promise.all([
		pageApi<Coach>(cookies, `/api/owner/coaches/${params.id}`),
		pageApi<Payment[]>(cookies, `/api/owner/coaches/${params.id}/payments`)
	]);
	return { coach, payments };
};
