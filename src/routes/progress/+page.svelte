<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Sparkline from '$lib/components/Sparkline.svelte';
	import StatDelta from '$lib/components/StatDelta.svelte';
	import { UNIT, type ExerciseProgress, type Verdict } from '$lib/types';
	import { IMPROVEMENT_VERDICTS, VERDICT_LABEL } from '$lib/utils/progression';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function verdictClass(verdict: Verdict): string {
		if (IMPROVEMENT_VERDICTS.includes(verdict)) return 'badge-accent';
		if (verdict === 'down') return 'badge-bad';
		return '';
	}
</script>

<svelte:head><title>Progress - Gym Tracker</title></svelte:head>

<PageHeader title="Progress" subtitle="Your progressive overload, week by week" />

{#if data.groups.length === 0}
	<EmptyState
		icon="trending"
		title="No data yet"
		message="Log sessions and you'll see how you progress on each exercise here: more weight, more reps or more volume."
	>
		<a href="/log" class="btn btn-primary"><Icon name="plus" size={16} stroke={2.5} /> Log session</a>
	</EmptyState>
{:else}
	<!-- Weekly recap: latest populated week vs the previous one -->
	{#if data.recap}
		{@const r = data.recap}
		<section class="recap card">
			<div class="recap-head">
				<div class="recap-headings">
					<h2 class="recap-title"><Icon name="flame" size={17} /> {r.label}</h2>
					<p class="recap-sub muted">{r.rangeLabel} · {r.prevLabel}</p>
				</div>
				<div class="dots" aria-hidden="true">
					{#each r.items as it (it.exerciseId)}
						<span
							class="dot"
							class:good={IMPROVEMENT_VERDICTS.includes(it.verdict)}
							class:bad={it.verdict === 'down'}
						></span>
					{/each}
				</div>
			</div>

			<div class="recap-counts">
				{#if r.improved > 0}
					<span class="rc good"><Icon name="up" size={13} stroke={2.5} /> {r.improved} improved</span>
				{/if}
				{#if r.same > 0}
					<span class="rc">{r.same} same</span>
				{/if}
				{#if r.down > 0}
					<span class="rc bad"><Icon name="down" size={13} stroke={2.5} /> {r.down} down</span>
				{/if}
			</div>

			<div class="recap-list">
				{#each r.items as it (it.exerciseId)}
					<a href="/progress/{it.exerciseId}" class="rl">
						<div class="rl-head">
							<span class="rl-name">{it.name}</span>
							<span class="badge {verdictClass(it.verdict)}">{VERDICT_LABEL[it.verdict]}</span>
						</div>
						<div class="rl-change stat-num">
							<span class="rl-set">{it.prevTopWeight}<span class="mul">×</span>{it.prevTopReps}</span>
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
	{#each data.groups as g (g.routine?.id ?? 'other')}
		<section class="group">
			<div class="group-head">
				{#if g.routine}
					<span class="group-dot" style="background:{g.routine.color}"></span>
					<h2 class="group-title">{g.routine.name}</h2>
				{:else}
					<h2 class="group-title muted-title">Other exercises</h2>
				{/if}
				<span class="group-count">{g.items.length}</span>
			</div>
			<div class="stack">
				{#each g.items as p (p.exercise.id)}
					{@render exerciseCard(p)}
				{/each}
			</div>
		</section>
	{/each}

	{#if data.untracked.length > 0}
		<h2 class="sub">No data yet</h2>
		<div class="stack">
			{#each data.untracked as ex (ex.id)}
				<div class="card untracked">
					<span class="ex-name">{ex.name}</span>
					<span class="muted small">Log it to start tracking</span>
				</div>
			{/each}
		</div>
	{/if}
{/if}

{#snippet exerciseCard(p: ExerciseProgress)}
	<a href="/progress/{p.exercise.id}" class="card card-hover ex">
		<div class="ex-main">
			<div class="ex-title">
				<span class="ex-name">{p.exercise.name}</span>
				{#if p.exercise.muscleGroup}
					<span class="muted ex-mg">{p.exercise.muscleGroup}</span>
				{/if}
			</div>
			{#if p.latest}
				<div class="ex-stats muted stat-num">
					<span><strong class="subtle">{p.latest.topWeight}</strong> {UNIT} × {p.latest.topReps}</span>
					<span class="sep">·</span>
					<span>e1RM <strong class="accent">{p.latest.bestE1rm}</strong></span>
				</div>
			{/if}
			<div class="ex-delta">
				{#if p.delta && p.delta.verdict === 'new'}
					<span class="badge">First week</span>
				{:else if p.delta && IMPROVEMENT_VERDICTS.includes(p.delta.verdict)}
					<span class="badge badge-accent">{VERDICT_LABEL[p.delta.verdict]}</span>
					{#if p.delta.weight !== 0}<StatDelta value={p.delta.weight} unit=" {UNIT}" />{/if}
					{#if p.delta.reps !== 0}<StatDelta value={p.delta.reps} unit=" reps" />{/if}
					{#if p.delta.weight === 0 && p.delta.reps === 0 && p.delta.volume !== 0}
						<StatDelta value={p.delta.volume} unit=" vol" />
					{/if}
				{:else if p.delta && p.delta.verdict === 'down'}
					<span class="badge badge-bad">Down</span>
				{:else}
					<span class="badge">Same</span>
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
	/* ---- Weekly recap ---- */
	.recap {
		padding: 1.1rem 1rem 1rem;
		margin-bottom: 1.75rem;
		background:
			radial-gradient(120% 120% at 100% 0%, rgba(234, 179, 8, 0.1), transparent 55%),
			var(--color-surface);
	}
	.recap-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}
	.recap-title {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 1.1rem;
		font-weight: 800;
		color: var(--color-accent-bright);
	}
	.recap-sub {
		font-size: 0.78rem;
		margin-top: 0.2rem;
	}
	.dots {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		flex-wrap: wrap;
		justify-content: flex-end;
		max-width: 40%;
		padding-top: 0.35rem;
	}
	.dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 999px;
		background: var(--color-muted);
		flex-shrink: 0;
	}
	.dot.good {
		background: var(--color-good);
	}
	.dot.bad {
		background: var(--color-bad);
	}

	.recap-counts {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin: 0.85rem 0 0.35rem;
	}
	.rc {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		font-size: 0.78rem;
		font-weight: 700;
		padding: 0.25rem 0.55rem;
		border-radius: 999px;
		background: var(--color-surface-2);
		color: var(--color-muted);
	}
	.rc.good {
		color: var(--color-good);
		background: color-mix(in srgb, var(--color-good) 14%, transparent);
	}
	.rc.bad {
		color: var(--color-bad);
		background: color-mix(in srgb, var(--color-bad) 14%, transparent);
	}

	.recap-list {
		display: flex;
		flex-direction: column;
	}
	.rl {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.7rem 0;
		text-decoration: none;
		color: var(--color-text);
		border-top: 1px solid var(--color-border);
	}
	.rl-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.rl-name {
		font-weight: 700;
		font-size: 0.98rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
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

	/* ---- Routine groups ---- */
	.group {
		margin-bottom: 1.6rem;
	}
	.group-head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.7rem;
	}
	.group-dot {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 999px;
		flex-shrink: 0;
	}
	.group-title {
		font-size: 1rem;
		font-weight: 800;
	}
	.muted-title {
		color: var(--color-muted);
	}
	.group-count {
		margin-left: auto;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--color-muted);
		background: var(--color-surface-2);
		border-radius: 999px;
		padding: 0.1rem 0.5rem;
		min-width: 1.4rem;
		text-align: center;
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.ex {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.95rem 1rem;
		text-decoration: none;
		color: var(--color-text);
	}
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
		font-weight: 700;
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
		padding: 0.85rem 1rem;
		opacity: 0.75;
	}
	.small {
		font-size: 0.78rem;
	}
</style>
