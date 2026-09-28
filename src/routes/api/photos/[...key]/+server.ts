import { error, redirect, type RequestHandler } from '@sveltejs/kit';
import { apiRedirect, ApiError } from '$lib/server/api';

// For <img src>: the API checks who may see the photo and answers with a
// short-lived bucket URL, which is passed on to the browser.
export const GET: RequestHandler = async ({ cookies, params, setHeaders }) => {
	let location: string | null;
	try {
		location = await apiRedirect(cookies, `/api/photos/${params.key}`);
	} catch (err) {
		if (err instanceof ApiError) throw error(err.status, err.message);
		throw err;
	}
	if (!location) throw error(502, 'El servidor no devolvió la foto');
	setHeaders({ 'cache-control': 'private, max-age=240' });
	throw redirect(302, location);
};
