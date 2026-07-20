import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

export const SESSION_COOKIE = 'gym_session';
const SESSION_VALUE = 'authenticated';

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

/** Valor firmado para guardar en la cookie de sesión. */
export function createSessionToken(): string {
	return `${SESSION_VALUE}.${hmac(SESSION_VALUE)}`;
}

/** Verifica que la cookie de sesión sea válida (firmada con nuestro secreto). */
export function verifySession(token: string | undefined): boolean {
	if (!token) return false;
	const idx = token.lastIndexOf('.');
	if (idx < 0) return false;
	const value = token.slice(0, idx);
	const mac = token.slice(idx + 1);
	if (value !== SESSION_VALUE) return false;
	return safeEqual(mac, hmac(value));
}

/** Compara el PIN ingresado contra AUTH_PIN de forma segura. */
export function checkPin(pin: string): boolean {
	const expected = env.AUTH_PIN ?? '';
	if (!expected) return false;
	return safeEqual(pin, expected);
}
