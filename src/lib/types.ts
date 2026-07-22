// Types that travel to the client (serializable — ids as strings).

/** Weight unit used across the whole app. */
export const UNIT = 'lb';

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
	mon: 'Monday',
	tue: 'Tuesday',
	wed: 'Wednesday',
	thu: 'Thursday',
	fri: 'Friday',
	sat: 'Saturday',
	sun: 'Sunday'
};

export const WEEKDAY_SHORT: Record<Weekday, string> = {
	mon: 'Mon',
	tue: 'Tue',
	wed: 'Wed',
	thu: 'Thu',
	fri: 'Fri',
	sat: 'Sat',
	sun: 'Sun'
};

// Allowed accent palette for routines (all harmonize with the dark/yellow theme).
export const ROUTINE_COLORS = [
	'#EAB308', // yellow (default)
	'#F97316', // orange
	'#EF4444', // red
	'#22C55E', // green
	'#3B82F6', // blue
	'#A855F7', // purple
	'#EC4899', // pink
	'#14B8A6' // teal
] as const;

export interface Exercise {
	id: string;
	name: string;
	muscleGroup: string;
	notes?: string;
}

/** Default number of planned sets when an exercise is added to a routine. */
export const DEFAULT_ROUTINE_SETS = 3;
/** Bounds for the planned-sets stepper. */
export const MIN_ROUTINE_SETS = 1;
export const MAX_ROUTINE_SETS = 10;

export interface RoutineExercise {
	exerciseId: string;
	sets: number; // planned number of sets for this exercise
}

export interface Routine {
	id: string;
	name: string;
	color: string;
	order: number;
	exercises: RoutineExercise[];
}

export interface WorkoutSet {
	weight: number;
	reps: number;
}

export interface SessionEntry {
	exerciseId: string;
	sets: WorkoutSet[];
}

/**
 * The most recent time an exercise was logged, shown as a reference while
 * logging it again ("last time you did 135×5, now beat it").
 */
export interface LastPerformance {
	date: string; // YYYY-MM-DD of that session
	sets: WorkoutSet[]; // the sets performed, in order
	topWeight: number; // heaviest set's weight
	topReps: number; // reps at that heaviest set
	bestE1rm: number; // best estimated 1RM across those sets
}

export interface Session {
	id: string;
	date: string; // YYYY-MM-DD
	routineId: string | null;
	notes?: string;
	entries: SessionEntry[];
}

export type Schedule = Record<Weekday, string | null>;

// ---- Progressive overload ----

export interface WeeklyStat {
	weekKey: string; // e.g. "2026-W29"
	weekStart: string; // YYYY-MM-DD (Monday)
	label: string; // e.g. "Jul 14"
	topWeight: number; // weight of the best set
	topReps: number; // reps at that weight
	bestE1rm: number; // estimated 1RM: best set of the week, averaged across validated formulas
	totalVolume: number; // Σ weight × reps
	totalSets: number;
	totalReps: number;
	sessions: number;
}

export type Verdict = 'weight' | 'reps' | 'both' | 'volume' | 'same' | 'down' | 'new';

export interface Delta {
	weight: number;
	reps: number;
	volume: number;
	e1rm: number;
	verdict: Verdict;
}

export interface ExerciseProgress {
	exercise: Exercise;
	weeks: WeeklyStat[];
	latest: WeeklyStat | null;
	previous: WeeklyStat | null;
	delta: Delta | null;
}

/** Tracked exercises grouped under the routine they belong to (null = no routine). */
export interface ProgressGroup {
	routine: { id: string; name: string; color: string } | null;
	items: ExerciseProgress[];
}

/** One exercise's change between the recap week and the previous week. */
export interface WeeklyRecapItem {
	exerciseId: string;
	name: string;
	muscleGroup: string;
	verdict: Verdict;
	weight: number;
	reps: number;
	e1rm: number;
	volume: number;
	prevTopWeight: number;
	prevTopReps: number;
	currTopWeight: number;
	currTopReps: number;
	prevE1rm: number;
	currE1rm: number;
}

/** Whole-week comparison: latest populated week vs the previous populated week. */
export interface WeeklyRecap {
	weekKey: string;
	label: string; // "This week" or "Week of Jul 14"
	rangeLabel: string; // "Jul 14 – Jul 20"
	prevLabel: string; // "vs week of Jul 7"
	improved: number;
	same: number;
	down: number;
	items: WeeklyRecapItem[];
}
