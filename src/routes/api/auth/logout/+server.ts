import { json, type RequestHandler } from '@sveltejs/kit';
import { ApiError, logout } from '$lib/server/api';

export const POST: RequestHandler = async ({ cookies }) => {
	try {
		await logout(cookies);
		return json({ ok: true });
	} catch (error) {
		if (error instanceof ApiError) return json({ error: error.message }, { status: error.status });
		throw error;
	}
};
