import type { PageServerLoad } from './$types';
import { api } from '$lib/server/api';
import { lastPerformanceByExercise } from '$lib/utils/progression';
import type { Exercise, Routine, Session } from '$lib/types';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const [exercises, routines, sessions] = await Promise.all([
		api<Exercise[]>(cookies, '/api/exercises'),
		api<Routine[]>(cookies, '/api/routines'),
		api<Session[]>(cookies, '/api/sessions')
	]);
	const routineById = new Map(routines.map((routine) => [routine.id, routine]));
	const history = sessions.slice(0, 12).map((session) => {
		const routine = session.routineId ? routineById.get(session.routineId) : null;
		return {
			id: session.id,
			date: session.date,
			routineName: routine?.name ?? null,
			routineColor: routine?.color ?? null,
			exerciseCount: session.entries.length,
			setCount: session.entries.reduce((count, entry) => count + entry.sets.length, 0)
		};
	});
	return {
		exercises,
		routines,
		initialRoutineId: url.searchParams.get('routine') ?? '',
		history,
		latestSession: sessions[0] ?? null,
		lastByExercise: lastPerformanceByExercise(sessions),
		lastByExerciseBeforeLatest: sessions[0]
			? lastPerformanceByExercise(sessions, {
					excludeSessionId: sessions[0].id,
					onOrBefore: sessions[0].date
				})
			: {}
	};
};
