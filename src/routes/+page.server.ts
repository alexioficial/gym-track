import type { PageServerLoad } from './$types';
import { api } from '$lib/server/api';
import { buildExerciseProgress, IMPROVEMENT_VERDICTS } from '$lib/utils/progression';
import {
	WEEKDAYS,
	WEEKDAY_LABELS,
	type Exercise,
	type Routine,
	type Schedule,
	type Session
} from '$lib/types';

export const load: PageServerLoad = async ({ cookies }) => {
	const [schedule, routines, exercises, sessions] = await Promise.all([
		api<Schedule>(cookies, '/api/schedule'),
		api<Routine[]>(cookies, '/api/routines'),
		api<Exercise[]>(cookies, '/api/exercises'),
		api<Session[]>(cookies, '/api/sessions')
	]);

	const todayIdx = (new Date().getDay() + 6) % 7; // Monday = 0
	const todayKey = WEEKDAYS[todayIdx];
	const todayRoutine = routines.find((r) => r.id === schedule[todayKey]) ?? null;

	const progress = buildExerciseProgress(sessions, exercises);
	const improvements = progress
		.filter((p) => p.delta && IMPROVEMENT_VERDICTS.includes(p.delta.verdict))
		.sort((a, b) => (b.delta?.e1rm ?? 0) - (a.delta?.e1rm ?? 0));

	const routineById = new Map(routines.map((r) => [r.id, r]));
	const recent = sessions.slice(0, 5).map((s) => {
		const routine = s.routineId ? routineById.get(s.routineId) : null;
		return {
			id: s.id,
			date: s.date,
			routineName: routine?.name ?? null,
			routineColor: routine?.color ?? null,
			exerciseCount: s.entries.length,
			setCount: s.entries.reduce((acc, e) => acc + e.sets.length, 0)
		};
	});

	return {
		today: { label: WEEKDAY_LABELS[todayKey], routine: todayRoutine },
		counts: {
			exercises: exercises.length,
			routines: routines.length,
			sessions: sessions.length
		},
		improvements,
		recent
	};
};
