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

<div class="log-mode" role="group" aria-label="Choose logging action">
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
		<h2 class="block-title">History</h2>
		<div class="history-ledger">
			{#each history as s (s.id)}
				<a href={resolve('/log/[id]', { id: s.id })} class="sess">
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
		margin-bottom: 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}
	.mode-option {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		min-height: 2.875rem;
		padding: 0.55rem 0.75rem;
		border: 0;
		border-bottom: 2px solid transparent;
		background: transparent;
		color: var(--color-muted);
		font-size: 0.85rem;
		font-weight: 700;
		cursor: pointer;
	}
	.mode-option.active {
		border-bottom-color: var(--color-accent);
		color: var(--color-accent-bright);
	}
	@media (hover: hover) { .mode-option:hover:not(:disabled) { background: var(--color-surface); color: var(--color-text); } }
	.mode-option:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.block {
		margin-top: 2rem;
	}
	.block-title {
		margin: 0;
		padding-bottom: 0.625rem;
		border-bottom: 1px solid var(--color-border);
		font-family: var(--font-sans);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-subtle);
	}
	.history-ledger { border-bottom: 1px solid var(--color-border); }
	.sess {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 3.75rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--color-border-soft);
		text-decoration: none;
		color: var(--color-text);
	}
	.sess:last-child { border-bottom: 0; }
	@media (hover: hover) { .sess:hover { background: var(--color-surface); } }
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
