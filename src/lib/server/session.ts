import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { collections, ObjectId } from './db';
import { randomToken, SESSION_COOKIE, sign } from './auth';
import { toSessionUser } from './users';
import type { SessionUser } from '$lib/types';

/** How long a login stays valid. Mirrors the cookie maxAge — long so you stay signed in. */
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 365; // 365 days

/**
 * Creates a persisted auth session for a user and returns its id.
 * The id (signed) is what goes in the cookie.
 */
export async function createAuthSession(userId: string): Promise<string> {
	const { authSessions } = await collections();
	const id = randomToken();
	const now = new Date();
	await authSessions.insertOne({
		_id: id,
		userId: new ObjectId(userId),
		expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
		createdAt: now
	});
	return id;
}

/**
 * Resolves a raw (already unsigned) session id to its user, or null if the
 * session is missing/expired or the user no longer exists.
 */
export async function resolveSession(sessionId: string | null): Promise<SessionUser | null> {
	if (!sessionId) return null;
	const { authSessions, users } = await collections();
	const sess = await authSessions.findOne({ _id: sessionId });
	if (!sess) return null;
	if (sess.expiresAt.getTime() <= Date.now()) {
		await authSessions.deleteOne({ _id: sessionId });
		return null;
	}
	const user = await users.findOne({ _id: sess.userId });
	if (!user) return null;
	return toSessionUser(user);
}

export async function destroyAuthSession(sessionId: string): Promise<void> {
	const { authSessions } = await collections();
	await authSessions.deleteOne({ _id: sessionId });
}

export async function destroyUserSessions(userId: string): Promise<void> {
	const { authSessions } = await collections();
	await authSessions.deleteMany({ userId: new ObjectId(userId) });
}

// ---- Cookie helpers ----

/** Creates a session for the user and writes the signed session cookie. */
export async function startSession(cookies: Cookies, userId: string): Promise<void> {
	const id = await createAuthSession(userId);
	cookies.set(SESSION_COOKIE, sign(id), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: Math.floor(SESSION_TTL_MS / 1000)
	});
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
