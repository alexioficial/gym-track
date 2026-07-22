import {
	collections,
	toId,
	requireId,
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

export async function getExercises(userId: string): Promise<Exercise[]> {
	const uid = requireId(userId);
	const { exercises } = await collections();
	const docs = await exercises.find({ userId: uid }).sort({ name: 1 }).toArray();
	return docs.map(mapExercise);
}

export async function getExercise(userId: string, id: string): Promise<Exercise | null> {
	const _id = toId(id);
	if (!_id) return null;
	const { exercises } = await collections();
	const doc = await exercises.findOne({ _id, userId: requireId(userId) });
	return doc ? mapExercise(doc) : null;
}

export async function createExercise(
	userId: string,
	data: { name: string; muscleGroup: string; notes?: string }
): Promise<void> {
	const { exercises } = await collections();
	const now = new Date();
	await exercises.insertOne({
		_id: new ObjectId(),
		userId: requireId(userId),
		name: data.name,
		muscleGroup: data.muscleGroup,
		notes: data.notes,
		createdAt: now,
		updatedAt: now
	});
}

export async function updateExercise(
	userId: string,
	id: string,
	data: { name: string; muscleGroup: string; notes?: string }
): Promise<void> {
	const _id = toId(id);
	if (!_id) return;
	const { exercises } = await collections();
	await exercises.updateOne(
		{ _id, userId: requireId(userId) },
		{ $set: { ...data, updatedAt: new Date() } }
	);
}

export async function deleteExercise(userId: string, id: string): Promise<void> {
	const _id = toId(id);
	if (!_id) return;
	const uid = requireId(userId);
	const { exercises, routines } = await collections();
	await exercises.deleteOne({ _id, userId: uid });
	// Remove the exercise from this user's routines (new + legacy shapes).
	await routines.updateMany(
		{ userId: uid, 'exercises.exerciseId': _id },
		{ $pull: { exercises: { exerciseId: _id } } }
	);
	await routines.updateMany({ userId: uid, exerciseIds: _id }, { $pull: { exerciseIds: _id } });
}

// ---- Routines ----

export async function getRoutines(userId: string): Promise<Routine[]> {
	const { routines } = await collections();
	const docs = await routines
		.find({ userId: requireId(userId) })
		.sort({ order: 1, name: 1 })
		.toArray();
	return docs.map(mapRoutine);
}

export async function getRoutine(userId: string, id: string): Promise<Routine | null> {
	const _id = toId(id);
	if (!_id) return null;
	const { routines } = await collections();
	const doc = await routines.findOne({ _id, userId: requireId(userId) });
	return doc ? mapRoutine(doc) : null;
}

export async function createRoutine(
	userId: string,
	data: { name: string; color: string; exercises?: RoutineExercise[] }
): Promise<void> {
	const uid = requireId(userId);
	const { routines } = await collections();
	const count = await routines.countDocuments({ userId: uid });
	const now = new Date();
	await routines.insertOne({
		_id: new ObjectId(),
		userId: uid,
		name: data.name,
		color: data.color,
		order: count,
		exercises: toRoutineExerciseDocs(data.exercises ?? []),
		createdAt: now,
		updatedAt: now
	});
}

export async function updateRoutine(
	userId: string,
	id: string,
	data: { name: string; color: string; exercises: RoutineExercise[] }
): Promise<void> {
	const _id = toId(id);
	if (!_id) return;
	const { routines } = await collections();
	await routines.updateOne(
		{ _id, userId: requireId(userId) },
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

export async function deleteRoutine(userId: string, id: string): Promise<void> {
	const _id = toId(id);
	if (!_id) return;
	const uid = requireId(userId);
	const { routines, schedule } = await collections();
	await routines.deleteOne({ _id, userId: uid });
	// Clear this user's weekly calendar wherever it pointed to this routine.
	const doc = await schedule.findOne({ userId: uid });
	if (doc) {
		const days: Record<Weekday, string | null> = { ...emptySchedule(), ...doc.days };
		let changed = false;
		for (const day of WEEKDAYS) {
			if (days[day] === id) {
				days[day] = null;
				changed = true;
			}
		}
		if (changed) await schedule.updateOne({ userId: uid }, { $set: { days } });
	}
}

// ---- Weekly calendar ----

function emptySchedule(): Schedule {
	return { mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null };
}

export async function getSchedule(userId: string): Promise<Schedule> {
	const { schedule } = await collections();
	const doc = await schedule.findOne({ userId: requireId(userId) });
	if (!doc) return emptySchedule();
	return { ...emptySchedule(), ...doc.days };
}

export async function setScheduleDay(
	userId: string,
	day: Weekday,
	routineId: string | null
): Promise<void> {
	const uid = requireId(userId);
	const { schedule } = await collections();
	const current = await schedule.findOne({ userId: uid });
	const days: Record<Weekday, string | null> = { ...emptySchedule(), ...(current?.days ?? {}) };
	days[day] = routineId || null;
	await schedule.updateOne(
		{ userId: uid },
		{ $set: { days }, $setOnInsert: { userId: uid } },
		{ upsert: true }
	);
}

// ---- Sessions ----

export async function getSessions(userId: string): Promise<Session[]> {
	const { sessions } = await collections();
	const docs = await sessions.find({ userId: requireId(userId) }).sort({ date: -1 }).toArray();
	return docs.map(mapSession);
}

export async function getSession(userId: string, id: string): Promise<Session | null> {
	const _id = toId(id);
	if (!_id) return null;
	const { sessions } = await collections();
	const doc = await sessions.findOne({ _id, userId: requireId(userId) });
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

export async function createSession(
	userId: string,
	data: { date: string; routineId: string | null; notes?: string; entries: SessionEntry[] }
): Promise<string> {
	const { sessions } = await collections();
	const _id = new ObjectId();
	await sessions.insertOne({
		_id,
		userId: requireId(userId),
		date: data.date,
		routineId: toId(data.routineId),
		notes: data.notes,
		entries: toEntryDocs(data.entries),
		createdAt: new Date()
	});
	return _id.toString();
}

export async function updateSession(
	userId: string,
	id: string,
	data: { date: string; routineId: string | null; notes?: string; entries: SessionEntry[] }
): Promise<void> {
	const _id = toId(id);
	if (!_id) return;
	const { sessions } = await collections();
	await sessions.updateOne(
		{ _id, userId: requireId(userId) },
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

export async function deleteSession(userId: string, id: string): Promise<void> {
	const _id = toId(id);
	if (!_id) return;
	const { sessions } = await collections();
	await sessions.deleteOne({ _id, userId: requireId(userId) });
}

// ---- One-time migration ----

/**
 * Assigns every ownerless document (from the single-user era) to `userId`.
 * Idempotent: once claimed, the `{ userId: { $exists: false } }` filter matches
 * nothing. Called once by the admin seed so the pre-accounts data gets an owner.
 */
export async function claimOrphanData(userId: string): Promise<void> {
	const uid = requireId(userId);
	const { exercises, routines, sessions, schedule } = await collections();
	const filter = { userId: { $exists: false } };
	const set = { $set: { userId: uid } };
	await Promise.all([
		exercises.updateMany(filter, set),
		routines.updateMany(filter, set),
		sessions.updateMany(filter, set),
		// Legacy schedule was the single doc _id:"weekly"; give it the owner.
		schedule.updateMany(filter, set)
	]);
}
