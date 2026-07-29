import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { api } from '$lib/server/api';

export const load: PageServerLoad = async ({ locals, cookies, params }) => {
	if (!locals.user?.isAdmin) throw error(403, 'Admins only');
	return { record: await api<Record<string, unknown>>(cookies, `/api/admin/audit/${params.id}`) };
};
