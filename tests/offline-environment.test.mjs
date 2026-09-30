import { describe, expect, test } from 'bun:test';

import { offlineSupported } from '../src/lib/offline/support.ts';

describe('offline environment', () => {
	test('only real https sites get offline mode', () => {
		const at = (protocol, hostname) => offlineSupported({ protocol, hostname });
		expect(at('https:', 'gym.widube.com')).toBe(true);
		expect(at('https:', 'localhost')).toBe(false);
		expect(at('https:', 'app.localhost')).toBe(false);
		expect(at('https:', '127.0.0.1')).toBe(false);
		expect(at('http:', 'localhost')).toBe(false);
		expect(at('http:', 'gym.widube.com')).toBe(false);
		expect(at('http:', '192.168.1.20')).toBe(false);
	});
});
