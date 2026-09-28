import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { pageApi } from '$lib/server/api';
import type { Payment } from '$lib/owner';

export const load: PageServerLoad = async ({ locals, cookies, params }) => {
	if (!locals.user?.isAdmin) throw error(403, 'Solo para administradores');
	return { payment: await pageApi<Payment>(cookies, `/api/owner/payments/${params.id}`) };
};
