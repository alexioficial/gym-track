import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { api } from '$lib/server/api';

interface AuditItem {
	id: string;
	createdAt: string;
	requestId: string;
	method: string;
	path: string;
	status: number;
	clientKind: string;
	reportedClientIp: string | null;
	durationMs: number;
}

function requireAdmin(locals: App.Locals) {
	if (!locals.user?.isAdmin) throw error(403, 'Admins only');
}

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	requireAdmin(locals);
	const filters = new URLSearchParams();
	for (const key of ['method', 'path', 'status', 'client', 'from', 'to']) {
		const value = url.searchParams.get(key)?.trim();
		if (value) filters.set(key, value);
	}
	filters.set('limit', '100');
	const query = filters.toString();
	return {
		items: await api<AuditItem[]>(cookies, `/api/admin/audit?${query}`),
		filters: Object.fromEntries(filters.entries())
	};
};
