import { env } from '$env/dynamic/private';
import { collections, ObjectId, type UserDoc } from './db';
import { hashPassword, verifyPassword } from './auth';
import { claimOrphanData } from './repo';
import type { SessionUser } from '$lib/types';

const USERNAME_RE = /^[a-z0-9._]{3,30}$/;

/** Doc → client-safe user (never leaks passwordHash). */
export function toSessionUser(d: UserDoc): SessionUser {
	return { id: d._id.toString(), username: d.username, isAdmin: d.isAdmin };
}

export function normalizeUsername(username: string): string {
	return username.trim().toLowerCase();
}

/** Usernames: lowercase letters, digits, dot and underscore only (3–30 chars). */
export function isValidUsername(username: string): boolean {
	return USERNAME_RE.test(username);
}

export async function getUserByUsername(username: string): Promise<UserDoc | null> {
	const { users } = await collections();
	return users.findOne({ username: normalizeUsername(username) });
}

export async function getUserById(id: string): Promise<UserDoc | null> {
	if (!ObjectId.isValid(id)) return null;
	const { users } = await collections();
	return users.findOne({ _id: new ObjectId(id) });
}

/** All users, newest first — for the admin panel. */
export async function listUsers(): Promise<UserDoc[]> {
	const { users } = await collections();
	return users.find().sort({ isAdmin: -1, username: 1 }).toArray();
}

/**
 * Creates a user. Throws 'invalid-username', 'weak-password' or 'username-taken'.
 * Only ever called by an admin.
 */
export async function createUser(data: {
	username: string;
	password: string;
	isAdmin?: boolean;
}): Promise<UserDoc> {
	const username = normalizeUsername(data.username);
	if (!isValidUsername(username)) throw new Error('invalid-username');
	if (data.password.length < 6) throw new Error('weak-password');

	const { users } = await collections();
	if (await users.findOne({ username })) throw new Error('username-taken');

	const now = new Date();
	const doc: UserDoc = {
		_id: new ObjectId(),
		username,
		passwordHash: hashPassword(data.password),
		isAdmin: data.isAdmin ?? false,
		createdAt: now,
		updatedAt: now
	};
	try {
		await users.insertOne(doc);
	} catch (e) {
		if (isDuplicateKey(e)) throw new Error('username-taken');
		throw e;
	}
	return doc;
}

export async function setUserPassword(id: string, password: string): Promise<void> {
	if (password.length < 6) throw new Error('weak-password');
	if (!ObjectId.isValid(id)) return;
	const { users } = await collections();
	await users.updateOne(
		{ _id: new ObjectId(id) },
		{ $set: { passwordHash: hashPassword(password), updatedAt: new Date() } }
	);
}

export async function deleteUser(id: string): Promise<void> {
	if (!ObjectId.isValid(id)) return;
	const { users } = await collections();
	// Never allow deleting an admin (also protects the seeded owner).
	await users.deleteOne({ _id: new ObjectId(id), isAdmin: { $ne: true } });
}

// ---- Admin seeding ----

let seedPromise: Promise<void> | null = null;

/** Ensures the admin account exists (runs once per process). */
export function ensureAdminSeeded(): Promise<void> {
	if (!seedPromise) seedPromise = seedAdmin().catch(() => {});
	return seedPromise;
}

async function seedAdmin(): Promise<void> {
	const username = normalizeUsername(env.ADMIN_USERNAME || 'alexioficial');
	// When ADMIN_PASSWORD is set it is authoritative (see the sync below); the
	// hardcoded fallback is only ever used to bootstrap a brand-new admin.
	const envPassword = env.ADMIN_PASSWORD || '';
	const password = envPassword || '1029384756';
	const { users } = await collections();

	let admin = await users.findOne({ username });
	if (!admin) {
		const now = new Date();
		admin = {
			_id: new ObjectId(),
			username,
			passwordHash: hashPassword(password),
			isAdmin: true,
			createdAt: now,
			updatedAt: now
		};
		try {
			await users.insertOne(admin);
		} catch (e) {
			// Lost a race with another worker seeding the same admin — re-read.
			if (!isDuplicateKey(e)) throw e;
			admin = await users.findOne({ username });
			if (!admin) return;
		}
	} else if (envPassword && !verifyPassword(envPassword, admin.passwordHash)) {
		// ADMIN_PASSWORD is authoritative: keep the existing admin's password in
		// sync with the env on every boot. Only rewrites when it actually differs,
		// so setting a strong ADMIN_PASSWORD + redeploy is enough to rotate it.
		await users.updateOne(
			{ _id: admin._id },
			{ $set: { passwordHash: hashPassword(envPassword), updatedAt: new Date() } }
		);
	}
	// Inherit the pre-accounts single-user data (idempotent after first claim).
	await claimOrphanData(admin._id.toString());
}

function isDuplicateKey(e: unknown): boolean {
	return typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 11000;
}
