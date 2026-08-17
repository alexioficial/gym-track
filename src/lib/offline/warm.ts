export const CORE_OFFLINE_ROUTES = ['/', '/routines', '/log', '/progress', '/exercises'] as const;

const WARM_VERSION_PREFIX = 'gym-tracker:offline-routes:';

function markerKey(userId: string): string {
	return `${WARM_VERSION_PREFIX}${userId}`;
}

export function routesAreWarm(storage: Storage, userId: string, version: string): boolean {
	return storage.getItem(markerKey(userId)) === version;
}

export function markRoutesWarm(storage: Storage, userId: string, version: string): void {
	storage.setItem(markerKey(userId), version);
}

export function clearRoutesWarm(storage: Storage, userId: string): void {
	storage.removeItem(markerKey(userId));
}
