import { redirect, type Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, verifySession } from '$lib/server/auth';

const PUBLIC_ROUTES = ['/login'];

export const handle: Handle = async ({ event, resolve }) => {
	const authed = verifySession(event.cookies.get(SESSION_COOKIE));
	event.locals.authed = authed;

	const path = event.url.pathname;
	const isPublic = PUBLIC_ROUTES.includes(path);

	if (!authed && !isPublic) {
		throw redirect(303, '/login');
	}
	if (authed && path === '/login') {
		throw redirect(303, '/');
	}

	return resolve(event);
};
