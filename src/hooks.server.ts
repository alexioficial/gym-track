import { redirect, type Handle } from '@sveltejs/kit';
import { api, ApiError } from '$lib/server/api';
import type { SessionUser } from '$lib/types';

// Only the login page is reachable without a session.
const PUBLIC_ROUTES = new Set(['/login', '/api/auth/login']);

export const handle: Handle = async ({ event, resolve }) => {
	try {
		event.locals.user = await api<SessionUser>(event.cookies, '/api/auth/me');
	} catch (error) {
		if (error instanceof ApiError && error.status === 401) event.locals.user = null;
		else throw error;
	}

	const path = event.url.pathname;

	if (!event.locals.user && !PUBLIC_ROUTES.has(path)) {
		throw redirect(303, '/login');
	}
	if (event.locals.user && path === '/login') {
		throw redirect(303, '/');
	}

	return resolve(event);
};
