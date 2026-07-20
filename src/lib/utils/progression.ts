import type {
	Delta,
	Exercise,
	ExerciseProgress,
	Session,
	Verdict,
	WeeklyStat,
	WorkoutSet
} from '$lib/types';

/** 1RM estimado con la fórmula de Epley. Fiable en 2–10 reps. */
export function epley1RM(weight: number, reps: number): number {
	if (weight <= 0 || reps <= 0) return 0;
	return weight * (1 + reps / 30);
}

/** Volumen total de una lista de sets: Σ (peso × reps). */
export function volume(sets: WorkoutSet[]): number {
	return sets.reduce((acc, s) => acc + s.weight * s.reps, 0);
}

/** El mejor set: el de más peso; a igualdad de peso, el de más reps. */
export function topSet(sets: WorkoutSet[]): WorkoutSet | null {
	let best: WorkoutSet | null = null;
	for (const s of sets) {
		if (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) {
			best = s;
		}
	}
	return best;
}

// ---- Semana ISO ----

function parseDate(ymd: string): Date {
	const [y, m, d] = ymd.split('-').map(Number);
	return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function pad(n: number): string {
	return String(n).padStart(2, '0');
}

function toYmd(d: Date): string {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Lunes de la semana que contiene `ymd`. */
export function weekStart(ymd: string): string {
	const d = parseDate(ymd);
	const dayNum = (d.getDay() + 6) % 7; // lunes = 0
	d.setDate(d.getDate() - dayNum);
	return toYmd(d);
}

/** Clave de semana ISO, ej "2026-W29". */
export function isoWeekKey(ymd: string): string {
	const d = parseDate(ymd);
	const dayNum = (d.getDay() + 6) % 7;
	d.setDate(d.getDate() - dayNum + 3); // jueves de esta semana
	const firstThursday = new Date(d.getFullYear(), 0, 4);
	const firstDayNum = (firstThursday.getDay() + 6) % 7;
	firstThursday.setDate(firstThursday.getDate() - firstDayNum + 3);
	const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
	return `${d.getFullYear()}-W${pad(week)}`;
}

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Etiqueta corta de la fecha, ej "14 jul". */
export function shortLabel(ymd: string): string {
	const d = parseDate(ymd);
	return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

const DOW_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Fecha con día de la semana, ej "Lun 14 jul". */
export function formatDate(ymd: string): string {
	const d = parseDate(ymd);
	return `${DOW_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** Fecha de hoy en formato YYYY-MM-DD (hora local). */
export function todayYmd(): string {
	const d = new Date();
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function round(n: number, decimals = 1): number {
	const f = 10 ** decimals;
	return Math.round(n * f) / f;
}

/**
 * Estadísticas por semana para un ejercicio dado, a partir de las sesiones.
 * Devuelve semanas ordenadas de más antigua a más reciente.
 */
export function weeklyStatsForExercise(sessions: Session[], exerciseId: string): WeeklyStat[] {
	const byWeek = new Map<string, { date: string; sets: WorkoutSet[]; sessionDates: Set<string> }>();

	for (const session of sessions) {
		const entry = session.entries.find((e) => e.exerciseId === exerciseId);
		if (!entry || entry.sets.length === 0) continue;
		const key = isoWeekKey(session.date);
		const bucket = byWeek.get(key) ?? { date: session.date, sets: [], sessionDates: new Set<string>() };
		// Guarda la fecha más temprana de la semana como referencia.
		if (session.date < bucket.date) bucket.date = session.date;
		bucket.sets.push(...entry.sets.filter((s) => s.weight > 0 && s.reps > 0));
		bucket.sessionDates.add(session.date);
		byWeek.set(key, bucket);
	}

	const weeks: WeeklyStat[] = [];
	for (const [weekKey, bucket] of byWeek) {
		if (bucket.sets.length === 0) continue;
		const start = weekStart(bucket.date);
		const top = topSet(bucket.sets);
		const bestE1rm = bucket.sets.reduce((max, s) => Math.max(max, epley1RM(s.weight, s.reps)), 0);
		weeks.push({
			weekKey,
			weekStart: start,
			label: shortLabel(start),
			topWeight: top?.weight ?? 0,
			topReps: top?.reps ?? 0,
			bestE1rm: round(bestE1rm),
			totalVolume: round(volume(bucket.sets)),
			totalSets: bucket.sets.length,
			totalReps: bucket.sets.reduce((acc, s) => acc + s.reps, 0),
			sessions: bucket.sessionDates.size
		});
	}

	weeks.sort((a, b) => (a.weekKey < b.weekKey ? -1 : a.weekKey > b.weekKey ? 1 : 0));
	return weeks;
}

/**
 * Compara la semana `curr` contra la `prev` y decide el veredicto de mejora.
 * Si no hay semana previa → "nuevo".
 */
export function weekOverWeekDelta(prev: WeeklyStat | null, curr: WeeklyStat): Delta {
	if (!prev) {
		return {
			weight: curr.topWeight,
			reps: curr.topReps,
			volume: curr.totalVolume,
			e1rm: curr.bestE1rm,
			verdict: 'nuevo'
		};
	}

	const dWeight = round(curr.topWeight - prev.topWeight);
	const dReps = curr.topReps - prev.topReps;
	const dVolume = round(curr.totalVolume - prev.totalVolume);
	const dE1rm = round(curr.bestE1rm - prev.bestE1rm);

	let verdict: Verdict;
	if (dWeight > 0 && dReps > 0) verdict = 'ambos';
	else if (dWeight > 0) verdict = 'peso';
	else if (dWeight === 0 && dReps > 0) verdict = 'reps';
	else if (dWeight >= 0 && dVolume > 0) verdict = 'volumen';
	else if (dE1rm < 0 || dVolume < 0 || dWeight < 0) verdict = 'baja';
	else verdict = 'igual';

	return { weight: dWeight, reps: dReps, volume: dVolume, e1rm: dE1rm, verdict };
}

/** Progreso por ejercicio: semanas + comparación última vs anterior. */
export function buildExerciseProgress(
	sessions: Session[],
	exercises: Exercise[]
): ExerciseProgress[] {
	return exercises.map((exercise) => {
		const weeks = weeklyStatsForExercise(sessions, exercise.id);
		const latest = weeks.length > 0 ? weeks[weeks.length - 1] : null;
		const previous = weeks.length >= 2 ? weeks[weeks.length - 2] : null;
		const delta = latest ? weekOverWeekDelta(previous, latest) : null;
		return { exercise, weeks, latest, previous, delta };
	});
}

export const IMPROVEMENT_VERDICTS: Verdict[] = ['peso', 'reps', 'ambos', 'volumen'];

export const VERDICT_LABEL: Record<Verdict, string> = {
	peso: 'Más peso',
	reps: 'Más reps',
	ambos: 'Peso + reps',
	volumen: 'Más volumen',
	igual: 'Igual',
	baja: 'Bajó',
	nuevo: 'Primera semana'
};
