<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Sparkline from '$lib/components/Sparkline.svelte';
	import StatDelta from '$lib/components/StatDelta.svelte';
	import { offlineData } from '$lib/offline/store';
	import { UNIT, type ExerciseProgress, type Verdict } from '$lib/types';
	import {
		IMPROVEMENT_VERDICTS,
		VERDICT_LABEL,
		buildExerciseProgress,
		buildWeeklyRecap,
		groupProgressByRoutine
	} from '$lib/utils/progression';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const view = $derived.by(() => {
		if (!$offlineData) return data;
		const progress = buildExerciseProgress($offlineData.sessions, $offlineData.exercises);
		return {
			groups: groupProgressByRoutine(progress, $offlineData.routines),
			recap: buildWeeklyRecap(progress),
			untracked: progress.filter((item) => item.weeks.length === 0).map((item) => item.exercise)
		};
	});

	function verdictClass(verdict: Verdict): string {
		if (IMPROVEMENT_VERDICTS.includes(verdict)) return 'positive';
		if (verdict === 'down') return 'negative';
		return 'neutral';
	}
</script>

<svelte:head><title>Progress - Gym Tracker</title></svelte:head>

<PageHeader title="Progress" subtitle="Your progressive overload, week by week" />

{#if view.groups.length === 0}
	<EmptyState
		icon="trending"
		title="No data yet"
		message="Log sessions and you'll see how you progress on each exercise here: more weight, more reps or more volume."
	>
		<a href={resolve('/log')} class="btn btn-primary"
			><Icon name="plus" size={16} stroke={2.5} /> Log session</a
		>
	</EmptyState>
{:else}
	<!-- Weekly recap: latest populated week vs the previous one -->
	{#if view.recap}
		{@const r = view.recap}
		<section class="recap">
			<div class="recap-head">
				<div class="recap-headings">
					<h2 class="recap-title">{r.label}</h2>
					<p class="recap-sub muted">{r.rangeLabel} · {r.prevLabel}</p>
				</div>
				<div class="recap-counts">
					{#if r.improved > 0}<span class="good">{r.improved} improved</span>{/if}
					{#if r.same > 0}<span>{r.same} same</span>{/if}
					{#if r.down > 0}<span class="bad">{r.down} down</span>{/if}
				</div>
			</div>

			<div class="recap-list">
				{#each r.items as it (it.exerciseId)}
					<a href={resolve('/progress/[exerciseId]', { exerciseId: it.exerciseId })} class="rl">
						<div class="rl-head">
							<span class="rl-name">{it.name}</span>
							<span class="recap-status {verdictClass(it.verdict)}">{VERDICT_LABEL[it.verdict]}</span>
						</div>
						<div class="rl-change stat-num">
							<span class="rl-set"
								>{it.prevTopWeight}<span class="mul">×</span>{it.prevTopReps}</span
							>
							<Icon name="chevron" size={14} />
							<span
								class="rl-set now"
								class:good={IMPROVEMENT_VERDICTS.includes(it.verdict)}
								class:bad={it.verdict === 'down'}
							>
								{it.currTopWeight}<span class="mul">×</span>{it.currTopReps}
							</span>
							<span class="rl-deltas">
								{#if it.weight !== 0}<StatDelta value={it.weight} unit=" {UNIT}" />{/if}
								{#if it.reps !== 0}<StatDelta value={it.reps} unit=" reps" />{/if}
								{#if it.weight === 0 && it.reps === 0 && it.volume !== 0}
									<StatDelta value={it.volume} unit=" vol" />
								{/if}
							</span>
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Exercises grouped by routine -->
	{#each view.groups as g (g.routine?.id ?? 'other')}
		<section class="group" style={g.routine ? `--group-color:${g.routine.color}` : undefined}>
			<div class="group-head">
				{#if g.routine}
					<span class="group-dot" style="background:{g.routine.color}"></span>
					<h2 class="group-title">{g.routine.name}</h2>
				{:else}
					<h2 class="group-title muted-title">Other exercises</h2>
				{/if}
				<span class="group-count">{g.items.length}</span>
			</div>
			<div class="group-list">
				{#each g.items as p (p.exercise.id)}
					{@render exerciseCard(p)}
				{/each}
			</div>
		</section>
	{/each}

	{#if view.untracked.length > 0}
		<h2 class="sub">No data yet</h2>
		<div class="untracked-list">
			{#each view.untracked as ex (ex.id)}
				<div class="untracked">
					<span class="ex-name">{ex.name}</span>
					<span class="muted small">Log it to start tracking</span>
				</div>
			{/each}
		</div>
	{/if}
{/if}

{#snippet exerciseCard(p: ExerciseProgress)}
	<a
		href={resolve('/progress/[exerciseId]', { exerciseId: p.exercise.id })}
		class="ex"
	>
		<div class="ex-main">
			<div class="ex-title">
				<span class="ex-name">{p.exercise.name}</span>
				{#if p.exercise.muscleGroup}
					<span class="muted ex-mg">{p.exercise.muscleGroup}</span>
				{/if}
			</div>
			{#if p.latest}
				<div class="ex-stats muted stat-num">
					<span
						><strong class="subtle">{p.latest.topWeight}</strong> {UNIT} × {p.latest.topReps}</span
					>
					<span class="sep">·</span>
					<span>e1RM <strong class="accent">{p.latest.bestE1rm}</strong></span>
				</div>
			{/if}
			<div class="ex-delta">
				{#if p.delta && p.delta.verdict === 'new'}
					<span class="status-text neutral">First week</span>
				{:else if p.delta && IMPROVEMENT_VERDICTS.includes(p.delta.verdict)}
					<span class="status-text positive">{VERDICT_LABEL[p.delta.verdict]}</span>
					{#if p.delta.weight !== 0}<StatDelta value={p.delta.weight} unit=" {UNIT}" />{/if}
					{#if p.delta.reps !== 0}<StatDelta value={p.delta.reps} unit=" reps" />{/if}
					{#if p.delta.weight === 0 && p.delta.reps === 0 && p.delta.volume !== 0}
						<StatDelta value={p.delta.volume} unit=" vol" />
					{/if}
				{:else if p.delta && p.delta.verdict === 'down'}
					<span class="status-text negative">Down</span>
				{:else}
					<span class="status-text neutral">Same</span>
				{/if}
			</div>
		</div>
		<div class="ex-right">
			<Sparkline values={p.weeks.map((w) => w.bestE1rm)} />
			<Icon name="chevron" size={16} />
		</div>
	</a>
{/snippet}

<style>
	.recap {
		margin-bottom: 2rem;
		border-top: 3px solid var(--color-accent);
		border-bottom: 1px solid var(--color-border);
	}
	.recap-head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 0;
		border-bottom: 1px solid var(--color-border);
	}
	.recap-title {
		margin: 0;
		font-size: 1.35rem;
		font-weight: 600;
	}
	.recap-sub {
		font-size: 0.78rem;
		margin: 0.25rem 0 0;
	}

	.recap-counts {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		justify-content: flex-end;
		color: var(--color-muted);
		font-family: var(--font-mono);
		font-size: 0.72rem;
	}

	.recap-list {
		display: flex;
		flex-direction: column;
	}
	.rl {
		display: grid;
		grid-template-columns: minmax(12rem, 1fr) minmax(18rem, 1.4fr);
		align-items: center;
		gap: 1rem;
		min-height: 4rem;
		padding: 0.75rem 0;
		text-decoration: none;
		color: var(--color-text);
		border-bottom: 1px solid var(--color-border-soft);
	}
	.rl:last-child { border-bottom: 0; }
	@media (hover: hover) { .rl:hover { background: var(--color-surface); } }
	.rl-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.rl-name {
		font-weight: 600;
		font-size: 0.98rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.recap-status, .status-text { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
	.positive { color: var(--color-good); }
	.negative { color: var(--color-bad); }
	.neutral { color: var(--color-muted); }
	.rl-change {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: 0.85rem;
		color: var(--color-muted);
	}
	.rl-change :global(svg) {
		color: var(--color-muted);
		flex-shrink: 0;
	}
	.rl-set {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}
	.rl-set .mul {
		opacity: 0.5;
		margin: 0 0.15rem;
	}
	.rl-set.now {
		color: var(--color-text);
		font-weight: 700;
	}
	.rl-set.now.good {
		color: var(--color-good);
	}
	.rl-set.now.bad {
		color: var(--color-bad);
	}
	.rl-deltas {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-left: auto;
	}

	.group {
		margin-bottom: 1.75rem;
		border-left: 3px solid var(--group-color, var(--color-border));
	}
	.group-head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0 0 0.625rem 0.75rem;
		border-bottom: 1px solid var(--color-border);
	}
	.group-dot {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 999px;
		flex-shrink: 0;
	}
	.group-title {
		font-size: 1.25rem;
		font-weight: 600;
	}
	.muted-title {
		color: var(--color-muted);
	}
	.group-count {
		margin-left: auto;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--color-muted);
		padding: 0.1rem 0.5rem;
		min-width: 1.4rem;
		text-align: center;
	}

	.group-list { padding-left: 0.75rem; }
	.ex {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 4.5rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--color-border-soft);
		text-decoration: none;
		color: var(--color-text);
	}
	.ex:last-child { border-bottom: 0; }
	@media (hover: hover) { .ex:hover { background: var(--color-surface); } }
	.ex-main {
		min-width: 0;
		flex: 1;
	}
	.ex-title {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}
	.ex-name {
		font-weight: 600;
		font-size: 1.02rem;
	}
	.ex-mg {
		font-size: 0.75rem;
	}
	.ex-stats {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.82rem;
		margin-top: 0.3rem;
	}
	.sep {
		opacity: 0.5;
	}
	.ex-delta {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-top: 0.5rem;
		flex-wrap: wrap;
	}
	.ex-right {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-shrink: 0;
		color: var(--color-muted);
	}

	.sub {
		font-size: 0.85rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-muted);
		margin: 1.75rem 0 0.75rem;
	}
	.untracked {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--color-border-soft);
		opacity: 0.75;
	}
	.untracked-list { border-block: 1px solid var(--color-border); }
	.small {
		font-size: 0.78rem;
	}

	@media (max-width: 680px) {
		.recap-head { align-items: flex-start; flex-direction: column; }
		.recap-counts { justify-content: flex-start; }
		.rl { grid-template-columns: 1fr; gap: 0.375rem; }
		.rl-change { display: grid; grid-template-columns: auto auto auto minmax(0, 1fr); }
		.rl-deltas { justify-content: flex-end; }
		.ex { align-items: flex-start; }
		.ex-right { align-items: flex-end; flex-direction: column; }
	}
</style>
