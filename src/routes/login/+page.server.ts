import { dev } from '$app/environment';
import { fail, redirect } from '@sveltejs/kit';
import { checkPin, createSessionToken, SESSION_COOKIE } from '$lib/server/auth';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const pin = String(data.get('pin') ?? '').trim();

		if (!pin) return fail(400, { error: 'Enter your PIN' });
		if (!checkPin(pin)) return fail(401, { error: 'Wrong PIN' });

		cookies.set(SESSION_COOKIE, createSessionToken(), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev,
			maxAge: 60 * 60 * 24 * 60 // 60 days
		});

		throw redirect(303, '/');
	}
};
