import { json, type RequestHandler } from '@sveltejs/kit';
import { api, ApiError } from '$lib/server/api';

// The owner panel forwards to /api/owner/* as is; the API enforces every rule.
const forward: RequestHandler = async ({ request, locals, cookies, params }) => {
	if (!locals.user?.isAdmin) return json({ error: 'Solo para administradores' }, { status: 403 });
	let body: string | undefined;
	if (request.method !== 'GET') {
		try {
			body = JSON.stringify(await request.json());
		} catch {
			return json({ error: 'Falta un cuerpo JSON' }, { status: 400 });
		}
	}
	try {
		const result = await api<unknown>(cookies, `/api/owner/${params.path}`, {
			method: request.method,
			body
		});
		return json(result ?? { ok: true }, { headers: { 'cache-control': 'no-store' } });
	} catch (error) {
		if (error instanceof ApiError) return json({ error: error.message }, { status: error.status });
		throw error;
	}
};

export const GET = forward;
export const POST = forward;
export const PUT = forward;
