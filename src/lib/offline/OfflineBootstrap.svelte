<script lang="ts">
	import { version } from '$app/environment';
	import { preloadData } from '$app/navigation';
	import { onMount } from 'svelte';
	import { initializeOffline, synchronize } from './store';
	import { initializeCoach } from './coach-store';
	import { offlineSupported } from './support';
	import type { OfflineSnapshot } from './types';
	import { CORE_OFFLINE_ROUTES, markRoutesWarm, routesAreWarm } from './warm';

	interface Props {
		userId: string;
		seed: OfflineSnapshot;
		/** Coaches also keep their clients offline. */
		coach?: boolean;
	}
	let { userId, seed, coach = false }: Props = $props();

	async function warmOfflineRoutes() {
		if (routesAreWarm(localStorage, userId, version)) return;

		// Warm only the five app shells. Their content comes from the IndexedDB snapshot;
		// preloading every session/exercise creates a request storm and can exhaust the API limit.
		for (const route of coach ? [...CORE_OFFLINE_ROUTES, '/coach'] : CORE_OFFLINE_ROUTES) {
			const response = await fetch(route);
			if (!response.ok) return;
			const result = await preloadData(route);
			if (result.type !== 'loaded' || result.status >= 400) return;
		}

		markRoutesWarm(localStorage, userId, version);
	}

	onMount(() => {
		void initializeOffline(userId, seed).then(async () => {
			void synchronize();
			if (coach) void initializeCoach(userId);
			if (offlineSupported(location) && 'serviceWorker' in navigator) {
				try {
					await navigator.serviceWorker.register('/service-worker.js');
					await navigator.serviceWorker.ready;
					await warmOfflineRoutes();
				} catch {
					// The app remains usable online when a browser blocks service workers.
				}
			}
		});
		return () => {
			// The store is intentionally retained between route changes.
		};
	});
</script>
