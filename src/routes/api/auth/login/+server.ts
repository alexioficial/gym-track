import { json, type RequestHandler } from '@sveltejs/kit';
import { ApiError, login } from '$lib/server/api';
import type { SessionUser } from '$lib/types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	let body: { username?: unknown; password?: unknown };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return json({ error: 'A JSON body is required' }, { status: 400 });
	}
	const username = typeof body.username === 'string' ? body.username.trim() : '';
	const password = typeof body.password === 'string' ? body.password : '';
	if (!username || !password) {
		return json({ error: 'Enter your username and password' }, { status: 400 });
	}
	try {
		return json(await login<SessionUser>(cookies, { username, password }));
	} catch (error) {
		if (error instanceof ApiError) {
			return json(
				{ error: error.status === 401 ? 'Wrong username or password' : error.message },
				{ status: error.status }
			);
		}
		throw error;
	}
};
