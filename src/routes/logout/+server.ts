import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE, unsign } from '$lib/server/auth';
import { clearSessionCookie, destroyAuthSession } from '$lib/server/session';

export const POST: RequestHandler = async ({ cookies }) => {
	const sessionId = unsign(cookies.get(SESSION_COOKIE));
	if (sessionId) await destroyAuthSession(sessionId);
	clearSessionCookie(cookies);
	throw redirect(303, '/login');
};
