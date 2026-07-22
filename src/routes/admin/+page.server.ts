import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createUser, deleteUser, getUserById, listUsers, setUserPassword } from '$lib/server/users';

function requireAdmin(locals: App.Locals) {
	if (!locals.user?.isAdmin) throw error(403, 'Admins only');
}

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);
	const users = await listUsers();
	return {
		users: users.map((u) => ({
			id: u._id.toString(),
			username: u.username,
			isAdmin: u.isAdmin,
			createdAt: u.createdAt.toISOString()
		}))
	};
};

const CREATE_ERRORS: Record<string, string> = {
	'invalid-username':
		'Username can only use lowercase letters, numbers, dots and underscores (3–30 chars).',
	'weak-password': 'Password must be at least 6 characters.',
	'username-taken': 'That username is already taken.'
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const username = String(data.get('username') ?? '').trim();
		const password = String(data.get('password') ?? '');
		try {
			await createUser({ username, password });
		} catch (e) {
			const key = e instanceof Error ? e.message : '';
			return fail(400, { username, error: CREATE_ERRORS[key] ?? 'Could not create user.' });
		}
		return { ok: 'created', username: username.toLowerCase() };
	},

	resetPassword: async ({ request, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const password = String(data.get('password') ?? '');
		if (!id) return fail(400, { error: 'Missing user' });
		try {
			await setUserPassword(id, password);
		} catch {
			return fail(400, { error: 'Password must be at least 6 characters.' });
		}
		return { ok: 'reset' };
	},

	delete: async ({ request, locals }) => {
		requireAdmin(locals);
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		if (!id) return fail(400, { error: 'Missing user' });
		if (id === locals.user!.id) return fail(400, { error: 'You cannot delete yourself.' });
		const target = await getUserById(id);
		if (target?.isAdmin) return fail(400, { error: 'You cannot delete an admin.' });
		await deleteUser(id);
		return { ok: 'deleted' };
	}
};
