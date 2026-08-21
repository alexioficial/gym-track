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

<section class="hero">
	<div class="hero-top">
		<span class="section-label">Today · {view.today.label}</span>
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

	<div class="hero-footer">
		<span class="hero-prompt">Ready when you are</span>
		<!-- The URL is base-aware; the query is appended after resolving the route. -->
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a href={logHref} class="btn btn-primary hero-btn">
			<Icon name="plus" size={18} stroke={2.5} /> Log session
		</a>
	</div>
</section>

<section class="counters">
	<a href={resolve('/exercises')} class="counter">
		<span class="counter-num stat-num">{view.counts.exercises}</span>
		<span class="counter-label">Exercises</span>
	</a>
	<a href={resolve('/routines')} class="counter">
		<span class="counter-num stat-num">{view.counts.routines}</span>
		<span class="counter-label">Routines</span>
	</a>
	<a href={resolve('/log')} class="counter">
		<span class="counter-num stat-num">{view.counts.sessions}</span>
		<span class="counter-label">Sessions</span>
	</a>
</section>

<section class="block">
	<div class="block-head">
		<h2 class="block-title">Your progress</h2>
		<a href={resolve('/progress')} class="block-link">See all <Icon name="chevron" size={14} /></a>
	</div>

	{#if view.improvements.length > 0}
		<div class="ledger-list">
			{#each view.improvements.slice(0, 4) as p (p.exercise.id)}
				{#if p.delta}
					<a
						href={resolve('/progress/[exerciseId]', { exerciseId: p.exercise.id })}
						class="imp"
					>
						<div class="imp-info">
							<span class="imp-name">{p.exercise.name}</span>
							<span class="imp-verdict">{VERDICT_LABEL[p.delta.verdict]}</span>
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
		<div class="note">
			<p class="muted">
				Log your sessions for at least <strong class="subtle">2 weeks</strong> to see where you're improving
				on each exercise.
			</p>
		</div>
	{/if}
</section>

{#if view.recent.length > 0}
	<section class="block">
		<div class="block-head">
			<h2 class="block-title">Recent sessions</h2>
		</div>
		<div class="ledger-list">
			{#each view.recent as s (s.id)}
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
	.hero {
		padding: 1.5rem;
		border: 1px solid var(--color-border);
		border-top: 3px solid var(--color-accent);
		border-radius: var(--radius-overlay);
		background: var(--color-surface-2);
	}
	.hero-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.hero-title {
		margin: 1rem 0 0;
		font-size: clamp(2rem, 6vw, 2.75rem);
		font-weight: 700;
		line-height: 0.95;
	}
	.hero-sub {
		margin: 0.5rem 0 0;
		font-size: 0.9rem;
	}
	.hero-footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--color-border); }
	.hero-prompt { color: var(--color-muted); font-size: 0.8rem; letter-spacing: 0.04em; text-transform: uppercase; }
	.hero-btn {
		min-width: 10rem;
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
		margin-top: 1.5rem;
		border-block: 1px solid var(--color-border);
	}
	.counter {
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 0.5rem;
		padding: 1rem;
		border-right: 1px solid var(--color-border);
		text-decoration: none;
		color: var(--color-text);
	}
	.counter:last-child { border-right: 0; }
	@media (hover: hover) { .counter:hover { background: var(--color-surface); } }
	.counter-num {
		font-family: var(--font-display);
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-accent-bright);
	}
	.counter-label {
		color: var(--color-muted);
		font-size: 0.78rem;
		font-weight: 600;
	}

	.block { margin-top: 2rem; }
	.block-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
		padding-bottom: 0.625rem;
		border-bottom: 1px solid var(--color-border);
	}
	.block-title {
		margin: 0;
		font-family: var(--font-sans);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
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

	.ledger-list { border-bottom: 1px solid var(--color-border); }

	.imp {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 3.5rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--color-border-soft);
		text-decoration: none;
		color: var(--color-text);
	}
	.imp:last-child { border-bottom: 0; }
	@media (hover: hover) { .imp:hover { background: var(--color-surface); } }
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
	.imp-verdict { color: var(--color-muted); font-size: 0.75rem; white-space: nowrap; }
	.imp-metrics {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-shrink: 0;
	}

	.note {
		padding: 1rem 0;
		border-bottom: 1px solid var(--color-border);
	}
	.note p {
		font-size: 0.88rem;
		line-height: 1.4;
	}

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

	@media (max-width: 560px) {
		.hero { padding: 1.25rem; }
		.hero-footer { align-items: stretch; flex-direction: column; }
		.hero-prompt { display: none; }
		.hero-btn { width: 100%; }
		.counter { flex-direction: column; align-items: center; gap: 0; padding-inline: 0.5rem; }
		.imp { align-items: flex-start; }
		.imp-info { align-items: flex-start; flex-direction: column; gap: 0.125rem; }
		.imp-metrics { gap: 0.5rem; }
	}
</style>
