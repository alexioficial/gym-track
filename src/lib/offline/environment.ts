import { browser } from '$app/environment';
import { offlineSupported } from './support';

const OFFLINE_DATABASES = ['gym-tracker-offline', 'gym-tracker-coach'];
const CACHE_PREFIX = 'gym-tracker-';
const WARM_PREFIX = 'gym-tracker:offline-routes:';

function deleteDatabase(name: string): Promise<void> {
	return new Promise((resolve) => {
		const request = indexedDB.deleteDatabase(name);
		// A blocked delete still completes once the other tab closes; don't hold the app for it.
		request.onsuccess = request.onerror = request.onblocked = () => resolve();
	});
}

async function purge(): Promise<void> {
	try {
		for (let i = localStorage.length - 1; i >= 0; i--) {
			const key = localStorage.key(i);
			if (key?.startsWith(WARM_PREFIX)) localStorage.removeItem(key);
		}
	} catch {
		// Blocked storage has nothing to clean.
	}
	await Promise.all([
		...OFFLINE_DATABASES.map(deleteDatabase),
		navigator.serviceWorker
			?.getRegistrations()
			.then((registrations) => Promise.all(registrations.map((item) => item.unregister()))),
		typeof caches === 'undefined'
			? undefined
			: caches
					.keys()
					.then((keys) =>
						Promise.all(
							keys.filter((key) => key.startsWith(CACHE_PREFIX)).map((key) => caches.delete(key))
						)
					)
	]).catch(() => undefined);
}

let purged: Promise<void> | null = null;

/**
 * Where offline mode is off, removes whatever an earlier visit left behind (service worker,
 * caches, IndexedDB copies). Runs once per page load; the stores wait for it before opening
 * their databases, so they always start from the server's data.
 */
export function purgeUnsupportedOfflineData(): Promise<void> {
	if (!browser || offlineSupported(location)) return Promise.resolve();
	return (purged ??= purge());
}
