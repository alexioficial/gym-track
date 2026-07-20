import {
	collections,
	toId,
	ObjectId,
	type ExerciseDoc,
	type RoutineDoc,
	type RoutineExerciseDoc,
	type SessionDoc
} from './db';
import {
	DEFAULT_ROUTINE_SETS,
	MAX_ROUTINE_SETS,
	MIN_ROUTINE_SETS,
	WEEKDAYS,
	type Exercise,
	type Routine,
	type RoutineExercise,
	type Schedule,
	type Session,
	type SessionEntry,
	type Weekday
} from '$lib/types';

// ---- Mappers (Doc → client type) ----

function mapExercise(d: ExerciseDoc): Exercise {
	return { id: d._id.toString(), name: d.name, muscleGroup: d.muscleGroup, notes: d.notes };
}

function mapRoutine(d: RoutineDoc): Routine {
	// Prefer the structured `exercises`; fall back to legacy `exerciseIds`.
	const exercises: RoutineExercise[] = d.exercises
		? d.exercises.map((e) => ({ exerciseId: e.exerciseId.toString(), sets: e.sets }))
		: (d.exerciseIds ?? []).map((x) => ({ exerciseId: x.toString(), sets: DEFAULT_ROUTINE_SETS }));
	return {
		id: d._id.toString(),
		name: d.name,
		color: d.color,
		order: d.order,
		exercises
	};
}

function clampSets(n: number): number {
	if (!Number.isFinite(n)) return DEFAULT_ROUTINE_SETS;
	return Math.min(MAX_ROUTINE_SETS, Math.max(MIN_ROUTINE_SETS, Math.round(n)));
}

function toRoutineExerciseDocs(list: RoutineExercise[]): RoutineExerciseDoc[] {
	return list
		.map((e) => ({ exerciseId: toId(e.exerciseId), sets: clampSets(e.sets) }))
		.filter((e): e is RoutineExerciseDoc => e.exerciseId !== null);
}

function mapSession(d: SessionDoc): Session {
	return {
		id: d._id.toString(),
		date: d.date,
		routineId: d.routineId ? d.routineId.toString() : null,
		notes: d.notes,
		entries: (d.entries ?? []).map((e) => ({
			exerciseId: e.exerciseId.toString(),
			sets: e.sets.map((s) => ({ weight: s.weight, reps: s.reps }))
		}))
	};
}

// ---- Exercises ----

export async function getExercises(): Promise<Exercise[]> {
	const { exercises } = await collections();
	const docs = await exercises.find().sort({ name: 1 }).toArray();
	return docs.map(mapExercise);
}

export async function getExercise(id: string): Promise<Exercise | null> {
	const _id = toId(id);
	if (!_id) return null;
	const { exercises } = await collections();
	const doc = await exercises.findOne({ _id });
	return doc ? mapExercise(doc) : null;
}

export async function createExercise(data: {
	name: string;
	muscleGroup: string;
	notes?: string;
}): Promise<void> {
	const { exercises } = await collections();
	const now = new Date();
	await exercises.insertOne({
		_id: new ObjectId(),
		name: data.name,
		muscleGroup: data.muscleGroup,
		notes: data.notes,
		createdAt: now,
		updatedAt: now
	});
}

export async function updateExercise(
	id: string,
	data: { name: string; muscleGroup: string; notes?: string }
): Promise<void> {
	const _id = toId(id);
	if (!_id) return;
	const { exercises } = await collections();
	await exercises.updateOne({ _id }, { $set: { ...data, updatedAt: new Date() } });
}

export async function deleteExercise(id: string): Promise<void> {
	const _id = toId(id);
	if (!_id) return;
	const { exercises, routines } = await collections();
	await exercises.deleteOne({ _id });
	// Remove the exercise from any routine that has it assigned (new + legacy shapes).
	await routines.updateMany(
		{ 'exercises.exerciseId': _id },
		{ $pull: { exercises: { exerciseId: _id } } }
	);
	await routines.updateMany({ exerciseIds: _id }, { $pull: { exerciseIds: _id } });
}

// ---- Routines ----

export async function getRoutines(): Promise<Routine[]> {
	const { routines } = await collections();
	const docs = await routines.find().sort({ order: 1, name: 1 }).toArray();
	return docs.map(mapRoutine);
}

export async function getRoutine(id: string): Promise<Routine | null> {
	const _id = toId(id);
	if (!_id) return null;
	const { routines } = await collections();
	const doc = await routines.findOne({ _id });
	return doc ? mapRoutine(doc) : null;
}

export async function createRoutine(data: {
	name: string;
	color: string;
	exercises?: RoutineExercise[];
}): Promise<void> {
	const { routines } = await collections();
	const count = await routines.countDocuments();
	const now = new Date();
	await routines.insertOne({
		_id: new ObjectId(),
		name: data.name,
		color: data.color,
		order: count,
		exercises: toRoutineExerciseDocs(data.exercises ?? []),
		createdAt: now,
		updatedAt: now
	});
}

export async function updateRoutine(
	id: string,
	data: { name: string; color: string; exercises: RoutineExercise[] }
): Promise<void> {
	const _id = toId(id);
	if (!_id) return;
	const { routines } = await collections();
	await routines.updateOne(
		{ _id },
		{
			$set: {
				name: data.name,
				color: data.color,
				exercises: toRoutineExerciseDocs(data.exercises),
				updatedAt: new Date()
			},
			// Drop the legacy field once the routine is saved in the new shape.
			$unset: { exerciseIds: '' }
		}
	);
}

export async function deleteRoutine(id: string): Promise<void> {
	const _id = toId(id);
	if (!_id) return;
	const { routines, schedule } = await collections();
	await routines.deleteOne({ _id });
	// Clear the weekly calendar wherever it pointed to this routine.
	const doc = await schedule.findOne({ _id: 'weekly' });
	if (doc) {
		const days: Record<Weekday, string | null> = { ...emptySchedule(), ...doc.days };
		let changed = false;
		for (const day of WEEKDAYS) {
			if (days[day] === id) {
				days[day] = null;
				changed = true;
			}
		}
		if (changed) await schedule.updateOne({ _id: 'weekly' }, { $set: { days } });
	}
}

// ---- Weekly calendar ----

function emptySchedule(): Schedule {
	return { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null };
}

export async function getSchedule(): Promise<Schedule> {
	const { schedule } = await collections();
	const doc = await schedule.findOne({ _id: 'weekly' });
	if (!doc) return emptySchedule();
	return { ...emptySchedule(), ...doc.days };
}

export async function setScheduleDay(day: Weekday, routineId: string | null): Promise<void> {
	const { schedule } = await collections();
	const current = await schedule.findOne({ _id: 'weekly' });
	const days: Record<Weekday, string | null> = { ...emptySchedule(), ...(current?.days ?? {}) };
	days[day] = routineId || null;
	await schedule.updateOne({ _id: 'weekly' }, { $set: { days } }, { upsert: true });
}

// ---- Sessions ----

export async function getSessions(): Promise<Session[]> {
	const { sessions } = await collections();
	const docs = await sessions.find().sort({ date: -1 }).toArray();
	return docs.map(mapSession);
}

export async function getSession(id: string): Promise<Session | null> {
	const _id = toId(id);
	if (!_id) return null;
	const { sessions } = await collections();
	const doc = await sessions.findOne({ _id });
	return doc ? mapSession(doc) : null;
}

function toEntryDocs(entries: SessionEntry[]) {
	return entries
		.map((e) => ({
			exerciseId: toId(e.exerciseId),
			sets: e.sets.filter((s) => s.weight >= 0 && s.reps > 0)
		}))
		.filter((e): e is { exerciseId: ObjectId; sets: { weight: number; reps: number }[] } => {
			return e.exerciseId !== null && e.sets.length > 0;
		});
}

export async function createSession(data: {
	date: string;
	routineId: string | null;
	notes?: string;
	entries: SessionEntry[];
}): Promise<string> {
	const { sessions } = await collections();
	const _id = new ObjectId();
	await sessions.insertOne({
		_id,
		date: data.date,
		routineId: toId(data.routineId),
		notes: data.notes,
		entries: toEntryDocs(data.entries),
		createdAt: new Date()
	});
	return _id.toString();
}

export async function updateSession(
	id: string,
	data: { date: string; routineId: string | null; notes?: string; entries: SessionEntry[] }
): Promise<void> {
	const _id = toId(id);
	if (!_id) return;
	const { sessions } = await collections();
	await sessions.updateOne(
		{ _id },
		{
			$set: {
				date: data.date,
				routineId: toId(data.routineId),
				notes: data.notes,
				entries: toEntryDocs(data.entries)
			}
		}
	);
}

export async function deleteSession(id: string): Promise<void> {
	const _id = toId(id);
	if (!_id) return;
	const { sessions } = await collections();
	await sessions.deleteOne({ _id });
}
