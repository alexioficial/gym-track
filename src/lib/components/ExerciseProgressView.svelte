<script lang="ts">
	import StatDelta from './StatDelta.svelte';
	import EmptyState from './EmptyState.svelte';
	import ProgressChart from './ProgressChart.svelte';
	import type { Delta, Exercise, WeeklyStat } from '$lib/types';
	import { displayStat, formatLoad, type WeightUnit } from '$lib/units';
	import { IMPROVEMENT_VERDICTS, VERDICT_LABEL, weekOverWeekDelta } from '$lib/utils/progression';

	interface Props {
		exercise: Exercise;
		weeks: WeeklyStat[];
		unit: WeightUnit;
		/** False when a coach looks at a client's progress: messages speak about them. */
		own?: boolean;
	}

	let { exercise, weeks, unit, own = true }: Props = $props();

	const latest = $derived(weeks.length > 0 ? weeks[weeks.length - 1] : null);
	const previous = $derived(weeks.length >= 2 ? weeks[weeks.length - 2] : null);
	const delta = $derived(latest ? weekOverWeekDelta(previous, latest) : null);
	const rows = $derived(
		weeks
			.map((w, i) => ({ week: w, delta: weekOverWeekDelta(i > 0 ? weeks[i - 1] : null, w) }))
			.reverse()
	);

	function message(d: Delta): string {
		switch (d.verdict) {
			case 'both':
				return own
					? 'Levantaste más peso y más repeticiones que la semana pasada.'
					: 'Levantó más peso y más repeticiones que la semana pasada.';
			case 'weight':
				return own
					? 'Levantaste más peso que la semana pasada.'
					: 'Levantó más peso que la semana pasada.';
			case 'reps':
				return own
					? 'Hiciste más repeticiones con el mismo peso.'
					: 'Hizo más repeticiones con el mismo peso.';
			case 'volume':
				return own
					? 'Hiciste más volumen total esta semana.'
					: 'Hizo más volumen total esta semana.';
			case 'same':
				return own
					? 'Te mantuviste igual que la semana pasada.'
					: 'Se mantuvo igual que la semana pasada.';
			case 'down':
				return own
					? 'Bajaste respecto a la semana pasada. ¡A por ello esta semana!'
					: 'Bajó respecto a la semana pasada.';
			case 'new':
				return own
					? 'Primera semana registrada. ¡A construir la base!'
					: 'Primera semana registrada.';
		}
	}

	function badgeClass(d: Delta): string {
		if (IMPROVEMENT_VERDICTS.includes(d.verdict)) return 'week-status positive';
		if (d.verdict === 'down') return 'week-status negative';
		return 'week-status neutral';
	}
</script>

<header class="head">
	<h1 class="head-title">{exercise.name}</h1>
	<div class="head-meta">
		{#if exercise.muscleGroup}<span class="muscle-group">{exercise.muscleGroup}</span>{/if}
		<span class="muted small">{weeks.length} {weeks.length === 1 ? 'semana' : 'semanas'}</span>
	</div>
</header>

{#if !latest || !delta}
	<EmptyState
		icon="trending"
		title="Todavía no hay datos"
		message={own
			? 'Registra sesiones con este ejercicio para ver tu progreso.'
			: 'Todavía no hay sesiones con este ejercicio.'}
	/>
{:else}
	<!-- Verdict of the week -->
	<div
		class="verdict"
		class:good={IMPROVEMENT_VERDICTS.includes(delta.verdict)}
		class:bad={delta.verdict === 'down'}
	>
		<div>
			<span class="verdict-tag">{VERDICT_LABEL[delta.verdict]}</span>
			<p class="verdict-msg">{message(delta)}</p>
		</div>
	</div>

	<!-- Stats actuales -->
	<div class="stats">
		<div class="stat">
			<span class="stat-label muted">e1RM</span>
			<span class="stat-value stat-num accent"
				>{displayStat(latest.bestE1rm, unit)}<small>{unit}</small></span
			>
			{#if previous}<StatDelta value={displayStat(delta.e1rm, unit)} unit=" {unit}" />{/if}
		</div>
		<div class="stat">
			<span class="stat-label muted">Mejor serie</span>
			<span class="stat-value stat-num"
				>{formatLoad(latest.topWeight, unit)}<small>×{latest.topReps}</small></span
			>
			{#if previous}<StatDelta value={displayStat(delta.weight, unit)} unit=" {unit}" />{/if}
		</div>
		<div class="stat">
			<span class="stat-label muted">Volumen</span>
			<span class="stat-value stat-num"
				>{displayStat(latest.totalVolume, unit)}<small>{unit}</small></span
			>
			{#if previous}<StatDelta value={displayStat(delta.volume, unit)} unit="" />{/if}
		</div>
	</div>

	<!-- Chart -->
	<ProgressChart {weeks} {unit} />

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
