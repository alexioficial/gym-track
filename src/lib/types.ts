// Tipos que viajan al cliente (serializables — ids como string).

/** Unidad de peso usada en toda la app. */
export const UNIT = 'lb';

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
	mon: 'Lunes',
	tue: 'Martes',
	wed: 'Miércoles',
	thu: 'Jueves',
	fri: 'Viernes',
	sat: 'Sábado',
	sun: 'Domingo'
};

export const WEEKDAY_SHORT: Record<Weekday, string> = {
	mon: 'Lun',
	tue: 'Mar',
	wed: 'Mié',
	thu: 'Jue',
	fri: 'Vie',
	sat: 'Sáb',
	sun: 'Dom'
};

// Paleta de acentos permitidos para rutinas (todos armonizan con el tema oscuro/amarillo).
export const ROUTINE_COLORS = [
	'#EAB308', // amarillo (default)
	'#F97316', // naranja
	'#EF4444', // rojo
	'#22C55E', // verde
	'#3B82F6', // azul
	'#A855F7', // púrpura
	'#EC4899', // rosa
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

// ---- Sobrecarga progresiva ----

export interface WeeklyStat {
	weekKey: string; // ej "2026-W29"
	weekStart: string; // YYYY-MM-DD (lunes)
	label: string; // ej "14 jul"
	topWeight: number; // peso del mejor set
	topReps: number; // reps a ese peso
	bestE1rm: number; // 1RM estimado (Epley) máximo de la semana
	totalVolume: number; // Σ peso × reps
	totalSets: number;
	totalReps: number;
	sessions: number;
}

export type Verdict = 'peso' | 'reps' | 'ambos' | 'volumen' | 'igual' | 'baja' | 'nuevo';

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
