<script lang="ts">
	import { version } from '$app/environment';
	import { preloadData } from '$app/navigation';
	import { onMount } from 'svelte';
	import { initializeOffline, synchronize } from './store';
	import type { OfflineSnapshot } from './types';
	import { CORE_OFFLINE_ROUTES, markRoutesWarm, routesAreWarm } from './warm';

	interface Props {
		userId: string;
		seed: OfflineSnapshot;
	}
	let { userId, seed }: Props = $props();

	async function warmOfflineRoutes() {
		if (routesAreWarm(localStorage, userId, version)) return;

		// Warm only the five app shells. Their content comes from the IndexedDB snapshot;
		// preloading every session/exercise creates a request storm and can exhaust the API limit.
		for (const route of CORE_OFFLINE_ROUTES) {
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
			if ('serviceWorker' in navigator) {
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
