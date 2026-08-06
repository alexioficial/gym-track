import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { api } from '$lib/server/api';

interface AdminUser {
	id: string;
	username: string;
	isAdmin: boolean;
	createdAt: string;
}

function requireAdmin(locals: App.Locals) {
	if (!locals.user?.isAdmin) throw error(403, 'Admins only');
}

export const load: PageServerLoad = async ({ locals, cookies }) => {
	requireAdmin(locals);
	return { users: await api<AdminUser[]>(cookies, '/api/admin/users') };
};
