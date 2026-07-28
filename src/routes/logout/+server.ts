import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logout } from '$lib/server/api';

export const POST: RequestHandler = async ({ cookies }) => {
	await logout(cookies);
	throw redirect(303, '/login');
};
