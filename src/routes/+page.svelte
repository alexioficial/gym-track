<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { resolve } from '$app/paths';
	import StatDelta from '$lib/components/StatDelta.svelte';
	import { offlineData } from '$lib/offline/store';
	import { UNIT, WEEKDAYS, WEEKDAY_LABELS } from '$lib/types';
	import {
		IMPROVEMENT_VERDICTS,
		VERDICT_LABEL,
		buildExerciseProgress,
		formatDate
	} from '$lib/utils/progression';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const view = $derived.by(() => {
		if (!$offlineData) return data;
		const { exercises, routines, sessions, schedule } = $offlineData;
		const todayIndex = (new Date().getDay() + 6) % 7;
		const todayKey = WEEKDAYS[todayIndex];
		const routine = routines.find((item) => item.id === schedule[todayKey]) ?? null;
		const progress = buildExerciseProgress(sessions, exercises);
		const improvements = progress
			.filter((item) => item.delta && IMPROVEMENT_VERDICTS.includes(item.delta.verdict))
			.sort((a, b) => (b.delta?.e1rm ?? 0) - (a.delta?.e1rm ?? 0));
		const routineById = new Map(routines.map((item) => [item.id, item]));
		return {
			today: { label: WEEKDAY_LABELS[todayKey], routine },
			counts: { exercises: exercises.length, routines: routines.length, sessions: sessions.length },
			improvements,
			recent: sessions.slice(0, 5).map((session) => {
				const linkedRoutine = session.routineId ? routineById.get(session.routineId) : null;
				return {
					id: session.id,
					date: session.date,
					routineName: linkedRoutine?.name ?? null,
					routineColor: linkedRoutine?.color ?? null,
					exerciseCount: session.entries.length,
					setCount: session.entries.reduce((count, entry) => count + entry.sets.length, 0)
				};
			})
		};
	});
	const logHref = $derived(
		view.today.routine ? `${resolve('/log')}?routine=${view.today.routine.id}` : resolve('/log')
	);
</script>

<svelte:head><title>Home - Gym Tracker</title></svelte:head>

<!-- Today -->
<section class="hero card">
	<div class="hero-top">
		<span class="muted hero-day">Today · {view.today.label}</span>
		{#if view.today.routine}
			<span class="dot" style="background:{view.today.routine.color}"></span>
		{/if}
	</div>

	{#if view.today.routine}
		<h1 class="hero-title">{view.today.routine.name}</h1>
		<p class="muted hero-sub">
			{view.today.routine.exercises.length} exercises in this routine
		</p>
	{:else}
		<h1 class="hero-title">Rest day</h1>
		<p class="muted hero-sub">No routine assigned for today</p>
	{/if}

	<!-- The URL is base-aware; the query is appended after resolving the route. -->
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a href={logHref} class="btn btn-primary hero-btn">
		<Icon name="plus" size={18} stroke={2.5} /> Log session
	</a>
</section>

<!-- Counters -->
<section class="counters">
	<a href={resolve('/exercises')} class="counter card card-hover">
		<span class="counter-num stat-num">{view.counts.exercises}</span>
		<span class="counter-label muted">Exercises</span>
	</a>
	<a href={resolve('/routines')} class="counter card card-hover">
		<span class="counter-num stat-num">{view.counts.routines}</span>
		<span class="counter-label muted">Routines</span>
	</a>
	<a href={resolve('/log')} class="counter card card-hover">
		<span class="counter-num stat-num">{view.counts.sessions}</span>
		<span class="counter-label muted">Sessions</span>
	</a>
</section>

<!-- Progress -->
<section class="block">
	<div class="block-head">
		<h2 class="block-title"><Icon name="flame" size={17} /> Your progress</h2>
		<a href={resolve('/progress')} class="block-link">See all <Icon name="chevron" size={14} /></a>
	</div>

	{#if view.improvements.length > 0}
		<div class="stack">
			{#each view.improvements.slice(0, 4) as p (p.exercise.id)}
				{#if p.delta}
					<a
						href={resolve('/progress/[exerciseId]', { exerciseId: p.exercise.id })}
						class="imp card card-hover"
					>
						<div class="imp-info">
							<span class="imp-name">{p.exercise.name}</span>
							<span class="badge badge-accent">{VERDICT_LABEL[p.delta.verdict]}</span>
						</div>
						<div class="imp-metrics">
							{#if p.delta.weight !== 0}
								<StatDelta value={p.delta.weight} unit=" {UNIT}" />
							{/if}
							{#if p.delta.reps !== 0}
								<StatDelta value={p.delta.reps} unit=" reps" />
							{/if}
							{#if p.delta.weight === 0 && p.delta.reps === 0 && p.delta.volume !== 0}
								<StatDelta value={p.delta.volume} unit=" {UNIT} vol" />
							{/if}
						</div>
					</a>
				{/if}
			{/each}
		</div>
	{:else}
		<div class="card note">
			<Icon name="trending" size={18} />
			<p class="muted">
				Log your sessions for at least <strong class="subtle">2 weeks</strong> to see where you're improving
				on each exercise.
			</p>
		</div>
	{/if}
</section>

<!-- Recent sessions -->
{#if view.recent.length > 0}
	<section class="block">
		<div class="block-head">
			<h2 class="block-title"><Icon name="clipboard" size={17} /> Recent sessions</h2>
		</div>
		<div class="stack">
			{#each view.recent as s (s.id)}
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
	.hero {
		padding: 1.5rem;
		background:
			radial-gradient(120% 120% at 100% 0%, rgba(234, 179, 8, 0.1), transparent 55%),
			var(--color-surface);
	}
	.hero-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.hero-day {
		font-size: 0.85rem;
		font-weight: 600;
		text-transform: capitalize;
	}
	.hero-title {
		font-size: 1.9rem;
		font-weight: 800;
		margin-top: 0.5rem;
	}
	.hero-sub {
		font-size: 0.9rem;
		margin-top: 0.25rem;
	}
	.hero-btn {
		margin-top: 1.25rem;
		width: 100%;
		padding: 0.85rem;
		font-size: 0.95rem;
	}

	.dot {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 999px;
		flex-shrink: 0;
	}

	.counters {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
		margin-top: 1rem;
	}
	.counter {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		padding: 1rem 0.5rem;
		text-decoration: none;
		color: var(--color-text);
	}
	.counter-num {
		font-size: 1.5rem;
		font-weight: 800;
		color: var(--color-accent-bright);
	}
	.counter-label {
		font-size: 0.75rem;
		font-weight: 600;
	}

	.block {
		margin-top: 1.75rem;
	}
	.block-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}
	.block-title {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--color-accent-bright);
	}
	.block-link {
		display: inline-flex;
		align-items: center;
		gap: 0.15rem;
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--color-muted);
		text-decoration: none;
	}
	.block-link:hover {
		color: var(--color-accent-bright);
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.imp {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.9rem 1rem;
		text-decoration: none;
		color: var(--color-text);
	}
	.imp-info {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-width: 0;
	}
	.imp-name {
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.imp-metrics {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-shrink: 0;
	}

	.note {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1.1rem;
		color: var(--color-accent-bright);
	}
	.note p {
		font-size: 0.88rem;
		line-height: 1.4;
	}

	.sess {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.85rem 1rem;
		text-decoration: none;
		color: var(--color-text);
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
