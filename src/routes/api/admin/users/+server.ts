import { json, type RequestHandler } from '@sveltejs/kit';
import { api, ApiError } from '$lib/server/api';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.user?.isAdmin) return json({ error: 'Admins only' }, { status: 403 });
	let body: { username?: unknown; password?: unknown };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return json({ error: 'A JSON body is required' }, { status: 400 });
	}
	const username = typeof body.username === 'string' ? body.username.trim() : '';
	const password = typeof body.password === 'string' ? body.password : '';
	try {
		await api(cookies, '/api/admin/users', {
			method: 'POST',
			body: JSON.stringify({ username, password })
		});
		return json({ ok: true, username: username.toLowerCase() });
	} catch (error) {
		if (error instanceof ApiError) return json({ error: error.message }, { status: error.status });
		throw error;
	}
};
