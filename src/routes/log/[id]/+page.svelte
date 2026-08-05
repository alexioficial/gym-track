<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { offlineData, queueOfflineMutation } from '$lib/offline/store';
	import SessionForm from '$lib/components/SessionForm.svelte';
	import { formatDate, lastPerformanceByExercise } from '$lib/utils/progression';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const session = $derived(
		$offlineData?.sessions.find((item) => item.id === data.session.id) ?? data.session
	);
	const exercises = $derived($offlineData?.exercises ?? data.exercises);
	const routines = $derived($offlineData?.routines ?? data.routines);
	const lastByExercise = $derived(
		$offlineData
			? lastPerformanceByExercise($offlineData.sessions, {
					excludeSessionId: session.id,
					onOrBefore: session.date
				})
			: data.lastByExercise
	);

	async function saveSession(input: {
		date: string;
		routineId: string | null;
		notes: string | undefined;
		entries: Array<{ exerciseId: string; sets: Array<{ weight: number; reps: number }> }>;
	}) {
		await queueOfflineMutation('session', 'update', session.id, input);
		await goto(resolve('/'));
	}

	async function deleteSession() {
		await queueOfflineMutation('session', 'delete', session.id);
		await goto(resolve('/'));
	}
</script>

<svelte:head><title>Edit session - Gym Tracker</title></svelte:head>

<a href={resolve('/log')} class="back">
	<Icon name="back" size={16} /> Back
</a>

<header class="head">
	<h1 class="head-title">Edit session</h1>
	<p class="muted head-sub">{formatDate(session.date)}</p>
</header>

{#key session.id}
	<SessionForm
		mode="edit"
		session={session}
		exercises={exercises}
		routines={routines}
		lastByExercise={lastByExercise}
		onSave={saveSession}
		onDelete={deleteSession}
	/>
{/key}

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-muted);
		text-decoration: none;
		margin-bottom: 1rem;
	}
	.back:hover {
		color: var(--color-accent-bright);
	}
	.head {
		margin-bottom: 1.25rem;
	}
	.head-title {
		font-size: 1.6rem;
		font-weight: 800;
	}
	.head-sub {
		font-size: 0.9rem;
		margin-top: 0.2rem;
		text-transform: capitalize;
	}
</style>
