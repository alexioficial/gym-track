import type {
	Delta,
	Exercise,
	ExerciseProgress,
	Session,
	Verdict,
	WeeklyStat,
	WorkoutSet
} from '$lib/types';

/** Estimated 1RM with the Epley formula. Reliable in the 2–10 rep range. */
export function epley1RM(weight: number, reps: number): number {
	if (weight <= 0 || reps <= 0) return 0;
	return weight * (1 + reps / 30);
}

/** Total volume of a list of sets: Σ (weight × reps). */
export function volume(sets: WorkoutSet[]): number {
	return sets.reduce((acc, s) => acc + s.weight * s.reps, 0);
}

/** The best set: heaviest weight; on a tie, the one with more reps. */
export function topSet(sets: WorkoutSet[]): WorkoutSet | null {
	let best: WorkoutSet | null = null;
	for (const s of sets) {
		if (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) {
			best = s;
		}
	}
	return best;
}

// ---- ISO week ----

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

/** Monday of the week that contains `ymd`. */
export function weekStart(ymd: string): string {
	const d = parseDate(ymd);
	const dayNum = (d.getDay() + 6) % 7; // Monday = 0
	d.setDate(d.getDate() - dayNum);
	return toYmd(d);
}

/** ISO week key, e.g. "2026-W29". */
export function isoWeekKey(ymd: string): string {
	const d = parseDate(ymd);
	const dayNum = (d.getDay() + 6) % 7;
	d.setDate(d.getDate() - dayNum + 3); // Thursday of this week
	const firstThursday = new Date(d.getFullYear(), 0, 4);
	const firstDayNum = (firstThursday.getDay() + 6) % 7;
	firstThursday.setDate(firstThursday.getDate() - firstDayNum + 3);
	const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
	return `${d.getFullYear()}-W${pad(week)}`;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Short date label, e.g. "Jul 14". */
export function shortLabel(ymd: string): string {
	const d = parseDate(ymd);
	return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Date with weekday, e.g. "Mon, Jul 14". */
export function formatDate(ymd: string): string {
	const d = parseDate(ymd);
	return `${DOW_SHORT[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/** Today's date in YYYY-MM-DD format (local time). */
export function todayYmd(): string {
	const d = new Date();
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function round(n: number, decimals = 1): number {
	const f = 10 ** decimals;
	return Math.round(n * f) / f;
}

/**
 * Weekly stats for a given exercise, computed from the sessions.
 * Returns weeks ordered from oldest to most recent.
 */
export function weeklyStatsForExercise(sessions: Session[], exerciseId: string): WeeklyStat[] {
	const byWeek = new Map<string, { date: string; sets: WorkoutSet[]; sessionDates: Set<string> }>();

	for (const session of sessions) {
		const entry = session.entries.find((e) => e.exerciseId === exerciseId);
		if (!entry || entry.sets.length === 0) continue;
		const key = isoWeekKey(session.date);
		const bucket = byWeek.get(key) ?? { date: session.date, sets: [], sessionDates: new Set<string>() };
		// Keep the earliest date of the week as the reference.
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
 * Compares week `curr` against `prev` and decides the improvement verdict.
 * If there is no previous week → "new".
 */
export function weekOverWeekDelta(prev: WeeklyStat | null, curr: WeeklyStat): Delta {
	if (!prev) {
		return {
			weight: curr.topWeight,
			reps: curr.topReps,
			volume: curr.totalVolume,
			e1rm: curr.bestE1rm,
			verdict: 'new'
		};
	}

	const dWeight = round(curr.topWeight - prev.topWeight);
	const dReps = curr.topReps - prev.topReps;
	const dVolume = round(curr.totalVolume - prev.totalVolume);
	const dE1rm = round(curr.bestE1rm - prev.bestE1rm);

	let verdict: Verdict;
	if (dWeight > 0 && dReps > 0) verdict = 'both';
	else if (dWeight > 0) verdict = 'weight';
	else if (dWeight === 0 && dReps > 0) verdict = 'reps';
	else if (dWeight >= 0 && dVolume > 0) verdict = 'volume';
	else if (dE1rm < 0 || dVolume < 0 || dWeight < 0) verdict = 'down';
	else verdict = 'same';

	return { weight: dWeight, reps: dReps, volume: dVolume, e1rm: dE1rm, verdict };
}

/** Progress per exercise: weeks + latest vs previous comparison. */
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

export const IMPROVEMENT_VERDICTS: Verdict[] = ['weight', 'reps', 'both', 'volume'];

export const VERDICT_LABEL: Record<Verdict, string> = {
	weight: 'More weight',
	reps: 'More reps',
	both: 'Weight + reps',
	volume: 'More volume',
	same: 'Same',
	down: 'Down',
	new: 'First week'
};
