<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import ProgressChart from '$lib/components/ProgressChart.svelte';
	import StatDelta from '$lib/components/StatDelta.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { UNIT, type Delta } from '$lib/types';
	import { IMPROVEMENT_VERDICTS, VERDICT_LABEL, weekOverWeekDelta } from '$lib/utils/progression';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const rows = $derived(
		data.weeks
			.map((w, i) => ({ week: w, delta: weekOverWeekDelta(i > 0 ? data.weeks[i - 1] : null, w) }))
			.reverse()
	);

	function message(d: Delta): string {
		switch (d.verdict) {
			case 'both':
				return 'You lifted more weight and more reps than last week. 🔥';
			case 'weight':
				return 'You lifted more weight than last week.';
			case 'reps':
				return 'You did more reps at the same weight.';
			case 'volume':
				return 'You did more total volume this week.';
			case 'same':
				return 'You held steady compared to last week.';
			case 'down':
				return 'You dropped compared to last week. Let’s get after it this week.';
			case 'new':
				return 'First week logged. Time to build the base!';
		}
	}

	function badgeClass(d: Delta): string {
		if (d.verdict === 'new') return 'badge';
		if (IMPROVEMENT_VERDICTS.includes(d.verdict)) return 'badge badge-accent';
		if (d.verdict === 'down') return 'badge badge-bad';
		return 'badge';
	}
</script>

<svelte:head><title>{data.exercise.name} · Progress</title></svelte:head>

<a href="/progress" class="back"><Icon name="back" size={16} /> Progress</a>

<header class="head">
	<h1 class="head-title">{data.exercise.name}</h1>
	<div class="head-meta">
		{#if data.exercise.muscleGroup}<span class="badge">{data.exercise.muscleGroup}</span>{/if}
		<span class="muted small">{data.weeks.length} {data.weeks.length === 1 ? 'week' : 'weeks'}</span>
	</div>
</header>

{#if !data.latest || !data.delta}
	<EmptyState icon="trending" title="No data yet" message="Log sessions with this exercise to see your progress." />
{:else}
	<!-- Verdict of the week -->
	<div
		class="verdict card"
		class:good={IMPROVEMENT_VERDICTS.includes(data.delta.verdict)}
		class:bad={data.delta.verdict === 'down'}
	>
		<div class="verdict-icon"><Icon name="flame" size={20} /></div>
		<div>
			<span class="verdict-tag">{VERDICT_LABEL[data.delta.verdict]}</span>
			<p class="verdict-msg">{message(data.delta)}</p>
		</div>
	</div>

	<!-- Stats actuales -->
	<div class="stats">
		<div class="stat card">
			<span class="stat-label muted">e1RM</span>
			<span class="stat-value stat-num accent">{data.latest.bestE1rm}<small>{UNIT}</small></span>
			{#if data.previous}<StatDelta value={data.delta.e1rm} unit=" {UNIT}" />{/if}
		</div>
		<div class="stat card">
			<span class="stat-label muted">Top set</span>
			<span class="stat-value stat-num">{data.latest.topWeight}<small>×{data.latest.topReps}</small></span>
			{#if data.previous}<StatDelta value={data.delta.weight} unit=" {UNIT}" />{/if}
		</div>
		<div class="stat card">
			<span class="stat-label muted">Volume</span>
			<span class="stat-value stat-num">{data.latest.totalVolume}<small>{UNIT}</small></span>
			{#if data.previous}<StatDelta value={data.delta.volume} unit="" />{/if}
		</div>
	</div>

	<!-- Chart -->
	<ProgressChart weeks={data.weeks} />

	<!-- Weekly table -->
	<h2 class="sub">Week by week</h2>
	<div class="table-wrap card">
		<table class="tbl">
			<thead>
				<tr>
					<th>Week</th>
					<th>Top set</th>
					<th>e1RM</th>
					<th>Vol.</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each rows as r (r.week.weekKey)}
					<tr>
						<td class="w-label">{r.week.label}</td>
						<td class="stat-num">{r.week.topWeight} × {r.week.topReps}</td>
						<td class="stat-num accent">{r.week.bestE1rm}</td>
						<td class="stat-num muted">{r.week.totalVolume}</td>
						<td class="w-verdict">
							<span class={badgeClass(r.delta)}>{VERDICT_LABEL[r.delta.verdict]}</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

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
		font-size: 1.7rem;
		font-weight: 800;
	}
	.head-meta {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-top: 0.5rem;
	}
	.small {
		font-size: 0.8rem;
	}

	.verdict {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 1rem 1.1rem;
		margin-bottom: 1rem;
	}
	.verdict.good {
		border-color: color-mix(in srgb, var(--color-accent) 45%, var(--color-border));
		background: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface));
	}
	.verdict.bad {
		border-color: color-mix(in srgb, var(--color-bad) 35%, var(--color-border));
	}
	.verdict-icon {
		display: grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-accent) 16%, transparent);
		color: var(--color-accent-bright);
		flex-shrink: 0;
	}
	.verdict.bad .verdict-icon {
		background: color-mix(in srgb, var(--color-bad) 14%, transparent);
		color: var(--color-bad);
	}
	.verdict-tag {
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-accent-bright);
	}
	.verdict.bad .verdict-tag {
		color: var(--color-bad);
	}
	.verdict-msg {
		font-size: 0.95rem;
		font-weight: 500;
		margin-top: 0.15rem;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.6rem;
		margin-bottom: 1rem;
	}
	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 0.85rem 0.75rem;
	}
	.stat-label {
		font-size: 0.72rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.stat-value {
		font-size: 1.35rem;
		font-weight: 800;
		line-height: 1;
	}
	.stat-value small {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--color-muted);
		margin-left: 0.15rem;
	}

	.sub {
		font-size: 0.85rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-muted);
		margin: 1.5rem 0 0.75rem;
	}
	.table-wrap {
		overflow-x: auto;
		padding: 0.25rem 0.25rem;
	}
	.tbl {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}
	.tbl th {
		text-align: left;
		font-size: 0.68rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--color-muted);
		padding: 0.6rem 0.7rem;
	}
	.tbl td {
		padding: 0.65rem 0.7rem;
		border-top: 1px solid var(--color-border-soft);
		white-space: nowrap;
	}
	.w-label {
		font-weight: 600;
	}
	.w-verdict {
		text-align: right;
	}
</style>
