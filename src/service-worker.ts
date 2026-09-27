/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';
import { isPrivateRoute, shouldUseCachedNavigation } from '$lib/offline/navigation';

declare const self: ServiceWorkerGlobalScope;

const CACHE = `gym-tracker-${version}`;
const STATIC = [...build, ...files];

async function cachedNavigation(request: Request): Promise<Response | undefined> {
	return (await caches.match(request)) ?? (await caches.match('/')) ?? undefined;
}

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(STATIC))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
			)
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
	const url = new URL(request.url);
	// API responses are kept in IndexedDB, never in the HTTP cache. Admin pages
	// hold other people's data and decrypted audit records, so they are never stored.
	if (url.pathname.startsWith('/api/') || isPrivateRoute(url.pathname)) return;

	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then(async (response) => {
					if (response.ok) {
						(await caches.open(CACHE)).put(request, response.clone());
						return response;
					}
					if (shouldUseCachedNavigation(response.status)) {
						return (await cachedNavigation(request)) ?? response;
					}
					return response;
				})
				.catch(async () => (await cachedNavigation(request)) ?? Response.error())
		);
		return;
	}

	// Page data changes on every save, so the network wins whenever it answers.
	// The cached copy only lets client-side navigation keep working offline.
	if (url.pathname.endsWith('/__data.json')) {
		event.respondWith(
			fetch(request)
				.then(async (response) => {
					if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
					return response;
				})
				.catch(async () => (await caches.match(request)) ?? Response.error())
		);
		return;
	}

	event.respondWith(
		caches.match(request).then(
			(cached) =>
				cached ??
				fetch(request).then(async (response) => {
					if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
					return response;
				})
		)
	);
});

self.addEventListener('message', (event) => {
	if (event.data?.type === 'clear-user-data') event.waitUntil(caches.delete(CACHE));
});
