<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { resolve } from '$app/paths';
	import ProgressChart from '$lib/components/ProgressChart.svelte';
	import StatDelta from '$lib/components/StatDelta.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { offlineData, weightUnitOf } from '$lib/offline/store';
	import type { Delta } from '$lib/types';
	import { displayStat, formatLoad } from '$lib/units';
	import {
		IMPROVEMENT_VERDICTS,
		VERDICT_LABEL,
		weeklyStatsForExercise,
		weekOverWeekDelta
	} from '$lib/utils/progression';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const unit = $derived(weightUnitOf($offlineData, data.user));

	const view = $derived.by(() => {
		if (!$offlineData) return data;
		const exercise =
			$offlineData.exercises.find((item) => item.id === data.exercise.id) ?? data.exercise;
		const weeks = weeklyStatsForExercise($offlineData.sessions, exercise.id);
		const latest = weeks.length > 0 ? weeks[weeks.length - 1] : null;
		const previous = weeks.length >= 2 ? weeks[weeks.length - 2] : null;
		return {
			exercise,
			weeks,
			latest,
			previous,
			delta: latest ? weekOverWeekDelta(previous, latest) : null
		};
	});
	const rows = $derived(
		view.weeks
			.map((w, i) => ({ week: w, delta: weekOverWeekDelta(i > 0 ? view.weeks[i - 1] : null, w) }))
			.reverse()
	);

	function message(d: Delta): string {
		switch (d.verdict) {
			case 'both':
				return 'Levantaste más peso y más repeticiones que la semana pasada.';
			case 'weight':
				return 'Levantaste más peso que la semana pasada.';
			case 'reps':
				return 'Hiciste más repeticiones con el mismo peso.';
			case 'volume':
				return 'Hiciste más volumen total esta semana.';
			case 'same':
				return 'Te mantuviste igual que la semana pasada.';
			case 'down':
				return 'Bajaste respecto a la semana pasada. ¡A por ello esta semana!';
			case 'new':
				return 'Primera semana registrada. ¡A construir la base!';
		}
	}

	function badgeClass(d: Delta): string {
		if (IMPROVEMENT_VERDICTS.includes(d.verdict)) return 'week-status positive';
		if (d.verdict === 'down') return 'week-status negative';
		return 'week-status neutral';
	}
</script>

<svelte:head><title>{view.exercise.name} - Progreso</title></svelte:head>

<a href={resolve('/progress')} class="back"><Icon name="back" size={16} /> Progreso</a>

<header class="head">
	<h1 class="head-title">{view.exercise.name}</h1>
	<div class="head-meta">
		{#if view.exercise.muscleGroup}<span class="muscle-group">{view.exercise.muscleGroup}</span
			>{/if}
		<span class="muted small"
			>{view.weeks.length} {view.weeks.length === 1 ? 'semana' : 'semanas'}</span
		>
	</div>
</header>

{#if !view.latest || !view.delta}
	<EmptyState
		icon="trending"
		title="Todavía no hay datos"
		message="Registra sesiones con este ejercicio para ver tu progreso."
	/>
{:else}
	<!-- Verdict of the week -->
	<div
		class="verdict"
		class:good={IMPROVEMENT_VERDICTS.includes(view.delta.verdict)}
		class:bad={view.delta.verdict === 'down'}
	>
		<div>
			<span class="verdict-tag">{VERDICT_LABEL[view.delta.verdict]}</span>
			<p class="verdict-msg">{message(view.delta)}</p>
		</div>
	</div>

	<!-- Stats actuales -->
	<div class="stats">
		<div class="stat">
			<span class="stat-label muted">e1RM</span>
			<span class="stat-value stat-num accent"
				>{displayStat(view.latest.bestE1rm, unit)}<small>{unit}</small></span
			>
			{#if view.previous}<StatDelta
					value={displayStat(view.delta.e1rm, unit)}
					unit=" {unit}"
				/>{/if}
		</div>
		<div class="stat">
			<span class="stat-label muted">Mejor serie</span>
			<span class="stat-value stat-num"
				>{formatLoad(view.latest.topWeight, unit)}<small>×{view.latest.topReps}</small></span
			>
			{#if view.previous}<StatDelta
					value={displayStat(view.delta.weight, unit)}
					unit=" {unit}"
				/>{/if}
		</div>
		<div class="stat">
			<span class="stat-label muted">Volumen</span>
			<span class="stat-value stat-num"
				>{displayStat(view.latest.totalVolume, unit)}<small>{unit}</small></span
			>
			{#if view.previous}<StatDelta value={displayStat(view.delta.volume, unit)} unit="" />{/if}
		</div>
	</div>

	<!-- Chart -->
	<ProgressChart weeks={view.weeks} {unit} />

	<!-- Weekly table -->
	<h2 class="sub">Semana a semana</h2>
	<div class="table-wrap">
		<table class="tbl">
			<thead>
				<tr>
					<th>Semana</th>
					<th>Mejor serie</th>
					<th>e1RM</th>
					<th>Vol.</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each rows as r (r.week.weekKey)}
					<tr>
						<td class="w-label">{r.week.label}</td>
						<td class="stat-num">{formatLoad(r.week.topWeight, unit)} × {r.week.topReps}</td>
						<td class="stat-num accent">{displayStat(r.week.bestE1rm, unit)}</td>
						<td class="stat-num muted">{displayStat(r.week.totalVolume, unit)}</td>
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
		margin: 0;
		font-size: clamp(1.8rem, 5vw, 2.4rem);
		font-weight: 700;
		line-height: 1;
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
	.muscle-group {
		color: var(--color-subtle);
		font-size: 0.8rem;
		font-weight: 600;
	}

	.verdict {
		padding: 1rem;
		margin-bottom: 1.5rem;
		border-left: 3px solid var(--color-border);
		background: var(--color-surface);
	}
	.verdict.good {
		border-left-color: var(--color-good);
	}
	.verdict.bad {
		border-left-color: var(--color-bad);
	}
	.verdict-tag {
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-good);
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
		margin-bottom: 1.5rem;
		border-block: 1px solid var(--color-border);
	}
	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 1rem;
		border-right: 1px solid var(--color-border);
	}
	.stat:last-child {
		border-right: 0;
	}
	.stat-label {
		font-size: 0.72rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.stat-value {
		font-family: var(--font-display);
		font-size: 1.6rem;
		font-weight: 700;
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
		border-block: 1px solid var(--color-border);
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
	.week-status {
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.positive {
		color: var(--color-good);
	}
	.negative {
		color: var(--color-bad);
	}
	.neutral {
		color: var(--color-muted);
	}
	@media (max-width: 560px) {
		.stat {
			padding-inline: 0.625rem;
		}
		.stat-value {
			font-size: 1.35rem;
		}
		.tbl th,
		.tbl td {
			padding-inline: 0.5rem;
		}
	}
</style>
