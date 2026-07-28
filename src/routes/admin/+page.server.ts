import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { api, ApiError } from '$lib/server/api';

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

function apiFailure(error: unknown, data: Record<string, string> = {}) {
	if (error instanceof ApiError) return fail(error.status, { ...data, error: error.message });
	throw error;
}

export const actions: Actions = {
	create: async ({ request, locals, cookies }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const username = String(data.get('username') ?? '').trim();
		const password = String(data.get('password') ?? '');
		try {
			await api(cookies, '/api/admin/users', {
				method: 'POST',
				body: JSON.stringify({ username, password })
			});
		} catch (error) {
			return apiFailure(error, { username });
		}
		return { ok: 'created', username: username.toLowerCase() };
	},

	resetPassword: async ({ request, locals, cookies }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const password = String(data.get('password') ?? '');
		if (!id) return fail(400, { error: 'Missing user' });
		try {
			await api(cookies, `/api/admin/users/${id}/password`, {
				method: 'PUT',
				body: JSON.stringify({ password })
			});
		} catch (error) {
			return apiFailure(error);
		}
		return { ok: 'reset' };
	},

	delete: async ({ request, locals, cookies }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing user' });
		if (id === locals.user!.id) return fail(400, { error: 'You cannot delete yourself.' });
		try {
			await api(cookies, `/api/admin/users/${id}`, { method: 'DELETE' });
		} catch (error) {
			return apiFailure(error);
		}
		return { ok: 'deleted' };
	}
};
