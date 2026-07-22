import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

/** Cookie holding the (signed) auth-session id. */
export const SESSION_COOKIE = 'gym_session';

function secret(): string {
	return env.SESSION_SECRET || 'dev-insecure-secret-change-me';
}

function hmac(value: string): string {
	return createHmac('sha256', secret()).update(value).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
	const ba = Buffer.from(a);
	const bb = Buffer.from(b);
	if (ba.length !== bb.length) return false;
	return timingSafeEqual(ba, bb);
}

// ---- Signed values (session id) ----

/** Signs an opaque value so it can be stored in a cookie and verified later. */
export function sign(value: string): string {
	return `${value}.${hmac(value)}`;
}

/** Returns the original value if the signature is valid, otherwise null. */
export function unsign(token: string | undefined): string | null {
	if (!token) return null;
	const idx = token.lastIndexOf('.');
	if (idx < 0) return null;
	const value = token.slice(0, idx);
	const mac = token.slice(idx + 1);
	if (!safeEqual(mac, hmac(value))) return null;
	return value;
}

/** A fresh, unguessable id (session id). */
export function randomToken(bytes = 32): string {
	return randomBytes(bytes).toString('hex');
}

// ---- Passwords (scrypt) ----

const SCRYPT_KEYLEN = 64;

/** Hashes a password with a per-user random salt. Format: `scrypt$<salt>$<hash>`. */
export function hashPassword(password: string): string {
	const salt = randomBytes(16).toString('hex');
	const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
	return `scrypt$${salt}$${hash}`;
}

/** Verifies a password against a stored `scrypt$salt$hash` string (constant-time). */
export function verifyPassword(password: string, stored: string | undefined): boolean {
	if (!stored) return false;
	const parts = stored.split('$');
	if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
	const [, salt, hashHex] = parts;
	const expected = Buffer.from(hashHex, 'hex');
	let actual: Buffer;
	try {
		actual = scryptSync(password, salt, expected.length);
	} catch {
		return false;
	}
	if (expected.length !== actual.length) return false;
	return timingSafeEqual(expected, actual);
}
