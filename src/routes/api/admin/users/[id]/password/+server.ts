import { json, type RequestHandler } from '@sveltejs/kit';
import { api, ApiError } from '$lib/server/api';

export const PUT: RequestHandler = async ({ request, params, locals, cookies }) => {
	if (!locals.user?.isAdmin) return json({ error: 'Admins only' }, { status: 403 });
	let body: { password?: unknown };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return json({ error: 'A JSON body is required' }, { status: 400 });
	}
	const password = typeof body.password === 'string' ? body.password : '';
	try {
		await api(cookies, `/api/admin/users/${params.id}/password`, {
			method: 'PUT',
			body: JSON.stringify({ password })
		});
		return json({ ok: true });
	} catch (error) {
		if (error instanceof ApiError) return json({ error: error.message }, { status: error.status });
		throw error;
	}
};
