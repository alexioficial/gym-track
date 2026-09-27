import { json, type RequestHandler } from '@sveltejs/kit';
import { api, ApiError } from '$lib/server/api';
import type { OfflineSyncResponse } from '$lib/offline/types';

export const GET: RequestHandler = async ({ cookies }) => {
	try {
		return json(await api<OfflineSyncResponse>(cookies, '/api/sync'));
	} catch (error) {
		if (error instanceof ApiError) return json({ error: error.message }, { status: error.status });
		throw error;
	}
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}
	try {
		return json(
			await api<OfflineSyncResponse>(cookies, '/api/sync', {
				method: 'POST',
				body: JSON.stringify(body)
			})
		);
	} catch (error) {
		if (error instanceof ApiError) return json({ error: error.message }, { status: error.status });
		throw error;
	}
};
