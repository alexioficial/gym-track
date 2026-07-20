import { MongoClient, type Collection, type Db, ObjectId } from 'mongodb';
import { env } from '$env/dynamic/private';
import type { Weekday } from '$lib/types';

// ---- Documents as stored in MongoDB ----

export interface ExerciseDoc {
	_id: ObjectId;
	name: string;
	muscleGroup: string;
	notes?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface RoutineExerciseDoc {
	exerciseId: ObjectId;
	sets: number;
}

export interface RoutineDoc {
	_id: ObjectId;
	name: string;
	color: string;
	order: number;
	exercises: RoutineExerciseDoc[];
	/** Legacy shape: older docs stored plain ids without a set count. */
	exerciseIds?: ObjectId[];
	createdAt: Date;
	updatedAt: Date;
}

export interface SetDoc {
	weight: number;
	reps: number;
}

export interface EntryDoc {
	exerciseId: ObjectId;
	sets: SetDoc[];
}

export interface SessionDoc {
	_id: ObjectId;
	date: string; // YYYY-MM-DD
	routineId: ObjectId | null;
	notes?: string;
	entries: EntryDoc[];
	createdAt: Date;
}

export interface ScheduleDoc {
	_id: string; // always "weekly"
	days: Record<Weekday, string | null>; // routineId (hex) or null
}

// ---- Connection (reusable singleton in dev/HMR) ----

const globalForMongo = globalThis as unknown as {
	_mongoClientPromise?: Promise<MongoClient>;
};

function clientPromise(): Promise<MongoClient> {
	const uri = env.MONGODB_URI;
	if (!uri) throw new Error('Missing MONGODB_URI environment variable');
	if (!globalForMongo._mongoClientPromise) {
		globalForMongo._mongoClientPromise = new MongoClient(uri).connect();
	}
	return globalForMongo._mongoClientPromise;
}

let indexesReady: Promise<void> | null = null;

async function ensureIndexes(db: Db): Promise<void> {
	await Promise.all([
		db.collection('sessions').createIndex({ date: -1 }),
		db.collection('sessions').createIndex({ 'entries.exerciseId': 1 }),
		db.collection('routines').createIndex({ order: 1 }),
		db.collection('exercises').createIndex({ name: 1 })
	]);
}

export async function getDb(): Promise<Db> {
	const client = await clientPromise();
	const db = client.db(env.MONGODB_DB || 'gym_tracker');
	if (!indexesReady) indexesReady = ensureIndexes(db).catch(() => {});
	return db;
}

export async function collections(): Promise<{
	exercises: Collection<ExerciseDoc>;
	routines: Collection<RoutineDoc>;
	sessions: Collection<SessionDoc>;
	schedule: Collection<ScheduleDoc>;
}> {
	const db = await getDb();
	return {
		exercises: db.collection<ExerciseDoc>('exercises'),
		routines: db.collection<RoutineDoc>('routines'),
		sessions: db.collection<SessionDoc>('sessions'),
		schedule: db.collection<ScheduleDoc>('schedule')
	};
}

/** Converts a string id to ObjectId; returns null if invalid. */
export function toId(id: string | null | undefined): ObjectId | null {
	if (!id || !ObjectId.isValid(id)) return null;
	return new ObjectId(id);
}

export { ObjectId };
