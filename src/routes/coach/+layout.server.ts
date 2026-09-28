import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	if (locals.user?.role !== 'coach') throw error(403, 'Solo para entrenadores');
};
