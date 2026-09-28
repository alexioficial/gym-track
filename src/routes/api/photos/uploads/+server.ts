import { json, type RequestHandler } from '@sveltejs/kit';
import { api, ApiError } from '$lib/server/api';

// Returns a presigned URL; the browser then sends the image straight to the bucket.
export const POST: RequestHandler = async ({ request, cookies, url }) => {
	let body: { contentType?: unknown };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return json({ error: 'Falta un cuerpo JSON' }, { status: 400 });
	}
	const userId = url.searchParams.get('userId');
	const path = userId
		? `/api/photos/uploads?userId=${encodeURIComponent(userId)}`
		: '/api/photos/uploads';
	try {
		return json(
			await api(cookies, path, {
				method: 'POST',
				body: JSON.stringify({ contentType: body.contentType })
			})
		);
	} catch (error) {
		if (error instanceof ApiError) return json({ error: error.message }, { status: error.status });
		throw error;
	}
};
