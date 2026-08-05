<script lang="ts">
	import { preloadData } from '$app/navigation';
	import { onMount } from 'svelte';
	import { currentOfflineSnapshot, initializeOffline, synchronize } from './store';
	import type { OfflineSnapshot } from './types';

	interface Props {
		userId: string;
		seed: OfflineSnapshot;
	}
	let { userId, seed }: Props = $props();

	async function warmOfflineRoutes() {
		const snapshot = currentOfflineSnapshot();
		const routes = new Set([
			'/',
			'/routines',
			'/log',
			'/progress',
			'/exercises',
			...snapshot.sessions.slice(0, 24).map((session) => `/log/${session.id}`),
			...snapshot.exercises.map((exercise) => `/progress/${exercise.id}`)
		]);
		await Promise.allSettled(
			[...routes].flatMap((route) => [fetch(route), preloadData(route)])
		);
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
