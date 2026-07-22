<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SessionForm from '$lib/components/SessionForm.svelte';
	import { formatDate } from '$lib/utils/progression';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Log session · Gym Tracker</title></svelte:head>

<PageHeader title="New session" subtitle="Log what you did today" />

<SessionForm
	mode="create"
	exercises={data.exercises}
	routines={data.routines}
	initialRoutineId={data.initialRoutineId}
	lastByExercise={data.lastByExercise}
/>

{#if data.history.length > 0}
	<section class="block">
		<h2 class="block-title"><Icon name="clipboard" size={16} /> History</h2>
		<div class="stack">
			{#each data.history as s (s.id)}
				<a href="/log/{s.id}" class="sess card card-hover">
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
