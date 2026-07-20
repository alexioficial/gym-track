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

export interface Routine {
	id: string;
	name: string;
	color: string;
	order: number;
	exerciseIds: string[];
}

export interface WorkoutSet {
	weight: number;
	reps: number;
}

export interface SessionEntry {
	exerciseId: string;
	sets: WorkoutSet[];
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
	bestE1rm: number; // estimated 1RM (Epley), max of the week
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
