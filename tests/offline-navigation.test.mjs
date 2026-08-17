import { describe, expect, test } from 'bun:test';
import { shouldUseCachedNavigation } from '../src/lib/offline/navigation.ts';
import {
	CORE_OFFLINE_ROUTES,
	clearRoutesWarm,
	markRoutesWarm,
	routesAreWarm
} from '../src/lib/offline/warm.ts';

describe('offline navigation fallback', () => {
	test('uses cached pages for rate limits and temporary server failures', () => {
		expect(shouldUseCachedNavigation(429)).toBe(true);
		expect(shouldUseCachedNavigation(500)).toBe(true);
		expect(shouldUseCachedNavigation(503)).toBe(true);
	});

	test('does not hide permanent client errors', () => {
		expect(shouldUseCachedNavigation(401)).toBe(false);
		expect(shouldUseCachedNavigation(404)).toBe(false);
	});
});

describe('offline route warming', () => {
	test('warms only the bounded top-level app shells', () => {
		expect(CORE_OFFLINE_ROUTES).toEqual(['/', '/routines', '/log', '/progress', '/exercises']);
	});

	test('tracks the warmed build independently for every user', () => {
		const values = new Map();
		const storage = {
			getItem: (key) => values.get(key) ?? null,
			setItem: (key, value) => values.set(key, value),
			removeItem: (key) => values.delete(key)
		};

		markRoutesWarm(storage, 'alex', 'build-1');
		expect(routesAreWarm(storage, 'alex', 'build-1')).toBe(true);
		expect(routesAreWarm(storage, 'alex', 'build-2')).toBe(false);
		expect(routesAreWarm(storage, 'juliux', 'build-1')).toBe(false);

		clearRoutesWarm(storage, 'alex');
		expect(routesAreWarm(storage, 'alex', 'build-1')).toBe(false);
	});
});
