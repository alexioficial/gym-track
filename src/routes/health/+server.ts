import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Liveness only: it must not depend on the API, so an API outage doesn't restart the web.
export const GET: RequestHandler = () =>
	json({ status: 'ok' }, { headers: { 'cache-control': 'no-store' } });
