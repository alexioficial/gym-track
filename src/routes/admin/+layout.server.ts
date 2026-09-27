import type { LayoutServerLoad } from './$types';

// Admin pages show other users and decrypted audit records; browsers must not keep them.
export const load: LayoutServerLoad = ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });
};
