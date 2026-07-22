import type {
	Delta,
	Exercise,
	ExerciseProgress,
	LastPerformance,
	ProgressGroup,
	Routine,
	Session,
	Verdict,
	WeeklyRecap,
	WeeklyRecapItem,
	WeeklyStat,
	WorkoutSet
} from '$lib/types';

// ---- 1RM estimation ----
//
// Estimating a true 1RM from a submaximal set carries a ~5–10% error, and every
// formula is biased in its own direction (Epley reads high below 10 reps, Brzycki
// low — they agree exactly at 10). Research consensus: estimates are only reliable
// up to ~10–12 reps, and AVERAGING several validated formulas beats trusting any
// single one. So instead of raw Epley we average five classic equations and clamp
// the rep count into the reliable range.
//   - https://arvo.guru/resources/one-rep-max-formulas
//   - "Accuracy of Seven Equations for Predicting 1RM" (best at 3–8 reps, poor >12)

/** Reps above this are unreliable for 1RM estimation, so they get clamped here. */
export const MAX_RELIABLE_REPS = 12;

/** Epley: reads slightly high below 10 reps. */
export function epley1RM(weight: number, reps: number): number {
	return weight * (1 + reps / 30);
}
/** Brzycki: reads slightly low below 10 reps; equals Epley exactly at 10. */
function brzycki1RM(weight: number, reps: number): number {
	return weight * (36 / (37 - reps));
}
/** Lombardi: simple power curve. */
function lombardi1RM(weight: number, reps: number): number {
	return weight * Math.pow(reps, 0.1);
}
/** Lander. */
function lander1RM(weight: number, reps: number): number {
	return (100 * weight) / (101.3 - 2.67123 * reps);
}
/** O'Conner: conservative linear estimate (0.025 = 1/40). */
function oconner1RM(weight: number, reps: number): number {
	return weight * (1 + reps / 40);
}

/**
 * Estimated 1RM for a single set: the average of five validated formulas, which
 * cancels the individual bias of any one of them. A single rep is already a max
 * (returned as-is); reps beyond the reliable range are clamped so a light,
 * high-rep burnout set can't inflate the estimate.
 */
export function estimate1RM(weight: number, reps: number): number {
	if (weight <= 0 || reps <= 0) return 0;
	if (reps === 1) return weight;
	const r = Math.min(reps, MAX_RELIABLE_REPS);
	const estimates = [
		epley1RM(weight, r),
		brzycki1RM(weight, r),
		lombardi1RM(weight, r),
		lander1RM(weight, r),
		oconner1RM(weight, r)
	];
	return estimates.reduce((a, b) => a + b, 0) / estimates.length;
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

function addDays(ymd: string, n: number): string {
	const d = parseDate(ymd);
	d.setDate(d.getDate() + n);
	return toYmd(d);
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
		// Best robust estimate across every set logged that week (not just one set).
		const bestE1rm = bucket.sets.reduce((max, s) => Math.max(max, estimate1RM(s.weight, s.reps)), 0);
		weeks.push({
			weekKey,
			weekStart: start,
			label: shortLabel(start),
			topWeight: top?.weight ?? 0,
			topReps: top?.reps ?? 0,
			bestE1rm: round(bestE1rm),
			totalVolume: round(volume(bucket.sets)),
			totalSets: bucket.sets.length,
			totalReps: round(bucket.sets.reduce((acc, s) => acc + s.reps, 0)),
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
	const dReps = round(curr.topReps - prev.topReps);
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

/**
 * The most recent logged performance for each exercise, to show as a reference
 * when logging it again. Sessions are scanned newest-first, so the first one
 * that contains an exercise wins. `excludeSessionId`/`onOrBefore` let the edit
 * screen skip the session being edited and ignore anything logged after it.
 */
export function lastPerformanceByExercise(
	sessions: Session[],
	opts: { excludeSessionId?: string; onOrBefore?: string } = {}
): Record<string, LastPerformance> {
	const sorted = [...sessions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
	const out: Record<string, LastPerformance> = {};
	for (const s of sorted) {
		if (opts.excludeSessionId && s.id === opts.excludeSessionId) continue;
		if (opts.onOrBefore && s.date > opts.onOrBefore) continue;
		for (const entry of s.entries) {
			if (out[entry.exerciseId]) continue; // already have a more recent one
			const sets = entry.sets.filter((st) => st.reps > 0);
			if (sets.length === 0) continue;
			const top = topSet(sets);
			out[entry.exerciseId] = {
				date: s.date,
				sets: sets.map((st) => ({ weight: st.weight, reps: st.reps })),
				topWeight: top?.weight ?? 0,
				topReps: top?.reps ?? 0,
				bestE1rm: round(sets.reduce((m, st) => Math.max(m, estimate1RM(st.weight, st.reps)), 0))
			};
		}
	}
	return out;
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

/**
 * Groups tracked exercises under the routine they belong to, respecting routine
 * order and each routine's own exercise order. Every exercise appears once (under
 * the first routine that contains it); anything not in a routine falls into a
 * trailing `null` group. Untracked exercises (no logged data) are left out.
 */
export function groupProgressByRoutine(
	progress: ExerciseProgress[],
	routines: Routine[]
): ProgressGroup[] {
	const tracked = progress.filter((p) => p.weeks.length > 0);
	const byId = new Map(tracked.map((p) => [p.exercise.id, p]));
	const assigned = new Set<string>();
	const groups: ProgressGroup[] = [];

	const sorted = [...routines].sort((a, b) => a.order - b.order);
	for (const r of sorted) {
		const items: ExerciseProgress[] = [];
		for (const re of r.exercises) {
			if (assigned.has(re.exerciseId)) continue;
			const p = byId.get(re.exerciseId);
			if (p) {
				items.push(p);
				assigned.add(re.exerciseId);
			}
		}
		if (items.length > 0) {
			groups.push({ routine: { id: r.id, name: r.name, color: r.color }, items });
		}
	}

	const others = tracked
		.filter((p) => !assigned.has(p.exercise.id))
		.sort((a, b) => {
			const aw = a.latest?.weekKey ?? '';
			const bw = b.latest?.weekKey ?? '';
			if (aw !== bw) return aw < bw ? 1 : -1;
			return a.exercise.name.localeCompare(b.exercise.name);
		});
	if (others.length > 0) groups.push({ routine: null, items: others });

	return groups;
}

/**
 * Compares the most recent populated week against the previous populated week,
 * per exercise. Only exercises with data in BOTH weeks are included. Returns
 * `null` when there aren't two populated weeks that share at least one exercise
 * (i.e. not enough data to compare) — the screen then shows nothing.
 */
export function buildWeeklyRecap(progress: ExerciseProgress[]): WeeklyRecap | null {
	const weekStarts = new Map<string, string>();
	for (const p of progress) {
		for (const w of p.weeks) weekStarts.set(w.weekKey, w.weekStart);
	}
	if (weekStarts.size < 2) return null;

	const keys = [...weekStarts.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)); // newest first
	const currKey = keys[0];
	const prevKey = keys[1];

	const items: WeeklyRecapItem[] = [];
	for (const p of progress) {
		const curr = p.weeks.find((w) => w.weekKey === currKey);
		const prev = p.weeks.find((w) => w.weekKey === prevKey);
		if (!curr || !prev) continue; // needs data in both weeks to be comparable
		const d = weekOverWeekDelta(prev, curr);
		items.push({
			exerciseId: p.exercise.id,
			name: p.exercise.name,
			muscleGroup: p.exercise.muscleGroup,
			verdict: d.verdict,
			weight: d.weight,
			reps: d.reps,
			e1rm: d.e1rm,
			volume: d.volume,
			prevTopWeight: prev.topWeight,
			prevTopReps: prev.topReps,
			currTopWeight: curr.topWeight,
			currTopReps: curr.topReps,
			prevE1rm: prev.bestE1rm,
			currE1rm: curr.bestE1rm
		});
	}
	if (items.length === 0) return null;

	const rank = (v: Verdict) => (IMPROVEMENT_VERDICTS.includes(v) ? 0 : v === 'same' ? 1 : 2);
	items.sort((a, b) => rank(a.verdict) - rank(b.verdict) || b.e1rm - a.e1rm);

	const improved = items.filter((i) => IMPROVEMENT_VERDICTS.includes(i.verdict)).length;
	const down = items.filter((i) => i.verdict === 'down').length;
	const same = items.length - improved - down;

	const currStart = weekStarts.get(currKey) as string;
	const prevStart = weekStarts.get(prevKey) as string;
	const isThisWeek = currKey === isoWeekKey(todayYmd());

	return {
		weekKey: currKey,
		label: isThisWeek ? 'This week' : `Week of ${shortLabel(currStart)}`,
		rangeLabel: `${shortLabel(currStart)} – ${shortLabel(addDays(currStart, 6))}`,
		prevLabel: `vs week of ${shortLabel(prevStart)}`,
		improved,
		same,
		down,
		items
	};
}
