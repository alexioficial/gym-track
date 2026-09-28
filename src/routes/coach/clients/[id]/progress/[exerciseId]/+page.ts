import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
	const { detail } = await parent();
	const exercise = detail.snapshot.exercises.find((item) => item.id === params.exerciseId);
	if (!exercise) throw error(404, 'Ejercicio no encontrado');
	return { exercise };
};
