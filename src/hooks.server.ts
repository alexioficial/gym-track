import { redirect, type Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, unsign } from '$lib/server/auth';
import { resolveSession } from '$lib/server/session';
import { ensureAdminSeeded } from '$lib/server/users';

// Only the login page is reachable without a session.
const PUBLIC_ROUTES = new Set(['/login']);

export const handle: Handle = async ({ event, resolve }) => {
	await ensureAdminSeeded();

	const sessionId = unsign(event.cookies.get(SESSION_COOKIE));
	event.locals.user = await resolveSession(sessionId);

	const path = event.url.pathname;

	if (!event.locals.user && !PUBLIC_ROUTES.has(path)) {
		throw redirect(303, '/login');
	}
	if (event.locals.user && path === '/login') {
		throw redirect(303, '/');
	}

	return resolve(event);
};
