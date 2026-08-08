<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { newEntityId, offlineData, queueOfflineMutation } from '$lib/offline/store';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SessionForm from '$lib/components/SessionForm.svelte';
	import { formatDate, lastPerformanceByExercise } from '$lib/utils/progression';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let logMode = $state<'create' | 'edit-last'>('create');
	const exercises = $derived($offlineData?.exercises ?? data.exercises);
	const routines = $derived($offlineData?.routines ?? data.routines);
	const sessions = $derived($offlineData?.sessions ?? []);
	const latestSession = $derived($offlineData ? (sessions[0] ?? null) : data.latestSession);
	const history = $derived.by(() => {
		if (!$offlineData) return data.history;
		const routineById = new Map(routines.map((routine) => [routine.id, routine]));
		return sessions.slice(0, 12).map((session) => {
			const routine = session.routineId ? routineById.get(session.routineId) : null;
			return {
				id: session.id,
				date: session.date,
				routineName: routine?.name ?? null,
				routineColor: routine?.color ?? null,
				exerciseCount: session.entries.length,
				setCount: session.entries.reduce((count, entry) => count + entry.sets.length, 0)
			};
		});
	});
	const lastByExercise = $derived(
		$offlineData ? lastPerformanceByExercise(sessions) : data.lastByExercise
	);
	const lastByExerciseBeforeLatest = $derived(
		$offlineData && latestSession
			? lastPerformanceByExercise(sessions, {
					excludeSessionId: latestSession.id,
					onOrBefore: latestSession.date
				})
			: data.lastByExerciseBeforeLatest
	);

	async function saveSession(input: {
		date: string;
		routineId: string | null;
		notes: string | undefined;
		entries: Array<{ exerciseId: string; sets: Array<{ weight: number; reps: number }> }>;
	}) {
		await queueOfflineMutation('session', 'create', newEntityId(), input);
		await goto(resolve('/'));
	}

	async function updateLatestSession(input: {
		date: string;
		routineId: string | null;
		notes: string | undefined;
		entries: Array<{ exerciseId: string; sets: Array<{ weight: number; reps: number }> }>;
	}) {
		if (!latestSession) return;
		await queueOfflineMutation('session', 'update', latestSession.id, input);
		await goto(resolve('/'));
	}
</script>

<svelte:head><title>Log session - Gym Tracker</title></svelte:head>

<PageHeader
	title={logMode === 'create' ? 'New session' : 'Modify last log'}
	subtitle={logMode === 'create'
		? 'Log what you did today'
		: latestSession
			? `Editing ${formatDate(latestSession.date)}`
			: 'There are no sessions to modify'}
/>

<div class="log-mode card" role="group" aria-label="Choose logging action">
	<button
		type="button"
		class="mode-option"
		class:active={logMode === 'create'}
		aria-pressed={logMode === 'create'}
		onclick={() => (logMode = 'create')}
	>
		<Icon name="plus" size={17} stroke={2.5} />
		<span>New log</span>
	</button>
	<button
		type="button"
		class="mode-option"
		class:active={logMode === 'edit-last'}
		aria-pressed={logMode === 'edit-last'}
		disabled={!latestSession}
		onclick={() => (logMode = 'edit-last')}
	>
		<Icon name="pencil" size={16} />
		<span>Modify last log</span>
	</button>
</div>

{#if logMode === 'create'}
	{#key 'create'}
		<SessionForm
			mode="create"
			{exercises}
			{routines}
			initialRoutineId={data.initialRoutineId}
			{lastByExercise}
			onSave={saveSession}
		/>
	{/key}
{:else if latestSession}
	{#key latestSession.id}
		<SessionForm
			mode="edit"
			session={latestSession}
			{exercises}
			{routines}
			lastByExercise={lastByExerciseBeforeLatest}
			onSave={updateLatestSession}
		/>
	{/key}
{/if}

{#if history.length > 0}
	<section class="block">
		<h2 class="block-title"><Icon name="clipboard" size={16} /> History</h2>
		<div class="stack">
			{#each history as s (s.id)}
				<a href={resolve('/log/[id]', { id: s.id })} class="sess card card-hover">
					<span class="dot" style="background:{s.routineColor ?? 'var(--color-muted)'}"></span>
					<div class="sess-info">
						<span class="sess-routine">{s.routineName ?? 'Free session'}</span>
						<span class="muted sess-date">{formatDate(s.date)}</span>
					</div>
					<span class="muted sess-meta stat-num">{s.exerciseCount} ex · {s.setCount} sets</span>
					<Icon name="chevron" size={16} />
				</a>
			{/each}
		</div>
	</section>
{/if}

<style>
	.log-mode {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.35rem;
		padding: 0.35rem;
		margin-bottom: 1rem;
	}
	.mode-option {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		min-height: 2.7rem;
		padding: 0.55rem 0.75rem;
		border-radius: 0.8rem;
		color: var(--color-muted);
		font-size: 0.85rem;
		font-weight: 700;
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			color 0.15s ease;
	}
	.mode-option.active {
		background: var(--color-accent);
		color: var(--color-bg);
	}
	.mode-option:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.block {
		margin-top: 2rem;
	}
	.block-title {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-subtle);
		margin-bottom: 0.75rem;
	}
	.stack {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.sess {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.85rem 1rem;
		text-decoration: none;
		color: var(--color-text);
	}
	.dot {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 999px;
		flex-shrink: 0;
	}
	.sess-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}
	.sess-routine {
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.sess-date {
		font-size: 0.8rem;
		text-transform: capitalize;
	}
	.sess-meta {
		font-size: 0.8rem;
		white-space: nowrap;
	}
</style>
