import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { verifyPassword } from '$lib/server/auth';
import { getUserByUsername } from '$lib/server/users';
import { startSession } from '$lib/server/session';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = String(data.get('username') ?? '').trim();
		const password = String(data.get('password') ?? '');

		if (!username || !password) {
			return fail(400, { username, error: 'Enter your username and password' });
		}

		const user = await getUserByUsername(username);
		if (!user || !verifyPassword(password, user.passwordHash)) {
			return fail(401, { username, error: 'Wrong username or password' });
		}

		await startSession(cookies, user._id.toString());
		throw redirect(303, '/');
	}
};
