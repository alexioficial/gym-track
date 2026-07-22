import { MongoClient, type Collection, type Db, ObjectId } from 'mongodb';
import { env } from '$env/dynamic/private';
import type { Weekday } from '$lib/types';

// ---- Documents as stored in MongoDB ----

export interface UserDoc {
	_id: ObjectId;
	username: string; // lowercased, unique; [a-z0-9._]
	passwordHash: string;
	isAdmin: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface AuthSessionDoc {
	_id: string; // random session id (also what the signed cookie carries)
	userId: ObjectId;
	expiresAt: Date;
	createdAt: Date;
}

export interface ExerciseDoc {
	_id: ObjectId;
	userId: ObjectId;
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
	userId: ObjectId;
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
	userId: ObjectId;
	date: string; // YYYY-MM-DD
	routineId: ObjectId | null;
	notes?: string;
	entries: EntryDoc[];
	createdAt: Date;
}

export interface ScheduleDoc {
	_id: ObjectId | string; // per-user; legacy claimed doc may keep _id "weekly"
	userId: ObjectId;
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
		// Auth
		db.collection('users').createIndex({ username: 1 }, { unique: true }),
		db.collection('auth_sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
		db.collection('auth_sessions').createIndex({ userId: 1 }),
		// Per-user data
		db.collection('sessions').createIndex({ userId: 1, date: -1 }),
		db.collection('sessions').createIndex({ userId: 1, 'entries.exerciseId': 1 }),
		db.collection('routines').createIndex({ userId: 1, order: 1 }),
		db.collection('exercises').createIndex({ userId: 1, name: 1 }),
		db.collection('schedule').createIndex({ userId: 1 }, { unique: true })
	]);
}

export async function getDb(): Promise<Db> {
	const client = await clientPromise();
	const db = client.db(env.MONGODB_DB || 'gym_tracker');
	if (!indexesReady) indexesReady = ensureIndexes(db).catch(() => {});
	return db;
}

export async function collections(): Promise<{
	users: Collection<UserDoc>;
	authSessions: Collection<AuthSessionDoc>;
	exercises: Collection<ExerciseDoc>;
	routines: Collection<RoutineDoc>;
	sessions: Collection<SessionDoc>;
	schedule: Collection<ScheduleDoc>;
}> {
	const db = await getDb();
	return {
		users: db.collection<UserDoc>('users'),
		authSessions: db.collection<AuthSessionDoc>('auth_sessions'),
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

/** Like {@link toId} but throws — use when the id is required (e.g. the logged-in user). */
export function requireId(id: string): ObjectId {
	const _id = toId(id);
	if (!_id) throw new Error(`Invalid ObjectId: ${id}`);
	return _id;
}

export { ObjectId };
