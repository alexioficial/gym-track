import { afterEach, describe, expect, test } from 'bun:test';
import { ClientApiError, jsonRequest } from '../src/lib/client/json.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe('manual JSON API client', () => {
	test('serializes an explicit JSON request', async () => {
		let captured;
		globalThis.fetch = async (path, init) => {
			captured = { path, init };
			return Response.json({ ok: true });
		};

		await jsonRequest('/api/example', 'POST', { name: 'Push', sets: 3 });

		expect(captured.path).toBe('/api/example');
		expect(captured.init.method).toBe('POST');
		expect(captured.init.headers['content-type']).toBe('application/json');
		expect(JSON.parse(captured.init.body)).toEqual({ name: 'Push', sets: 3 });
	});

	test('surfaces a JSON API error with its status', async () => {
		globalThis.fetch = async () => Response.json({ error: 'Invalid routine' }, { status: 400 });

		try {
			await jsonRequest('/api/example', 'PUT', { name: '' });
			throw new Error('Expected jsonRequest to fail');
		} catch (error) {
			expect(error).toBeInstanceOf(ClientApiError);
			expect(error.message).toBe('Invalid routine');
			expect(error.status).toBe(400);
		}
	});
});
