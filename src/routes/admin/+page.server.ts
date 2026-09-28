import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { pageApi } from '$lib/server/api';
import type { Role } from '$lib/types';

interface AdminUser {
	id: string;
	username: string;
	isAdmin: boolean;
	role: Role;
	coachId?: string;
	createdAt: string;
}

function requireAdmin(locals: App.Locals) {
	if (!locals.user?.isAdmin) throw error(403, 'Solo para administradores');
}

export const load: PageServerLoad = async ({ locals, cookies }) => {
	requireAdmin(locals);
	return { users: await pageApi<AdminUser[]>(cookies, '/api/admin/users') };
};
