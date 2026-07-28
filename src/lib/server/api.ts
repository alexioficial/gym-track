import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';

export const SESSION_COOKIE = 'gym_session';

const apiUrl = (env.API_URL || 'http://localhost:8080').replace(/\/$/, '');
const frontendOrigin = (env.ORIGIN || 'http://localhost:3000').replace(/\/$/, '');

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		message: string
	) {
		super(message);
	}
}

async function request(cookies: Cookies, path: string, init: RequestInit = {}): Promise<Response> {
	const headers = new Headers(init.headers);
	const token = cookies.get(SESSION_COOKIE);
	if (token) headers.set('cookie', `${SESSION_COOKIE}=${token}`);
	if (init.method && init.method !== 'GET') headers.set('origin', frontendOrigin);
	if (init.body) headers.set('content-type', 'application/json');

	const response = await fetch(`${apiUrl}${path}`, { ...init, headers });
	if (!response.ok) {
		let message = 'The API request failed';
		try {
			const body = (await response.json()) as { error?: unknown };
			if (typeof body.error === 'string') message = body.error;
		} catch {
			// A reverse proxy may return a non-JSON error page.
		}
		throw new ApiError(response.status, message);
	}
	return response;
}

export async function api<T>(cookies: Cookies, path: string, init: RequestInit = {}): Promise<T> {
	const response = await request(cookies, path, init);
	if (response.status === 204) return undefined as T;
	return (await response.json()) as T;
}

function sessionToken(response: Response): string | null {
	const header = response.headers.get('set-cookie');
	return /(?:^|,\s*)gym_session=([^;]+)/.exec(header ?? '')?.[1] ?? null;
}

function writeSessionCookie(cookies: Cookies, token: string): void {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: 60 * 60 * 24 * 365
	});
}

export async function login<T>(
	cookies: Cookies,
	credentials: { username: string; password: string }
): Promise<T> {
	const response = await request(cookies, '/api/auth/login', {
		method: 'POST',
		body: JSON.stringify(credentials)
	});
	const token = sessionToken(response);
	if (!token) throw new ApiError(502, 'The API did not create a session');
	writeSessionCookie(cookies, token);
	return (await response.json()) as T;
}

export async function logout(cookies: Cookies): Promise<void> {
	await request(cookies, '/api/auth/logout', { method: 'POST' });
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
