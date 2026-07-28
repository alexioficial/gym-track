import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { ApiError, login } from '$lib/server/api';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = String(data.get('username') ?? '').trim();
		const password = String(data.get('password') ?? '');

		if (!username || !password) {
			return fail(400, { username, error: 'Enter your username and password' });
		}

		try {
			await login(cookies, { username, password });
		} catch (error) {
			if (error instanceof ApiError && error.status === 401) {
				return fail(401, { username, error: 'Wrong username or password' });
			}
			throw error;
		}

		if (!cookies.get('gym_session')) {
			return fail(401, { username, error: 'Wrong username or password' });
		}
		throw redirect(303, '/');
	}
};
