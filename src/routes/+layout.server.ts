import type { LayoutServerLoad } from './$types';
import { api } from '$lib/server/api';
import type { OfflineSyncResponse } from '$lib/offline/types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	if (!locals.user) return { user: null, offline: null };
	try {
		const sync = await api<OfflineSyncResponse>(cookies, '/api/sync');
		return { user: locals.user, offline: sync.snapshot };
	} catch {
		// During a rolling deployment the frontend can arrive before the API route.
		// Keep the normal server-rendered experience available until the next load.
		return { user: locals.user, offline: null };
	}
};
