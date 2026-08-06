import { json, type RequestHandler } from '@sveltejs/kit';
import { api, ApiError } from '$lib/server/api';

export const DELETE: RequestHandler = async ({ params, locals, cookies }) => {
	if (!locals.user?.isAdmin) return json({ error: 'Admins only' }, { status: 403 });
	if (params.id === locals.user.id) {
		return json({ error: 'You cannot delete yourself.' }, { status: 400 });
	}
	try {
		await api(cookies, `/api/admin/users/${params.id}`, { method: 'DELETE' });
		return json({ ok: true });
	} catch (error) {
		if (error instanceof ApiError) return json({ error: error.message }, { status: error.status });
		throw error;
	}
};
