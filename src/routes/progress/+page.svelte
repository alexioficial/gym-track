<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Sparkline from '$lib/components/Sparkline.svelte';
	import StatDelta from '$lib/components/StatDelta.svelte';
	import { UNIT } from '$lib/types';
	import { IMPROVEMENT_VERDICTS, VERDICT_LABEL } from '$lib/utils/progression';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Progreso · Gym Tracker</title></svelte:head>

<PageHeader title="Progreso" subtitle="Tu sobrecarga progresiva, semana a semana" />

{#if data.tracked.length === 0}
	<EmptyState
		icon="trending"
		title="Aún no hay datos"
		message="Registra sesiones y aquí verás cómo progresas en cada ejercicio: más peso, más reps o más volumen."
	>
		<a href="/log" class="btn btn-primary"><Icon name="plus" size={16} stroke={2.5} /> Registrar sesión</a>
	</EmptyState>
{:else}
	<div class="stack">
		{#each data.tracked as p (p.exercise.id)}
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
						{#if p.delta && p.delta.verdict === 'nuevo'}
							<span class="badge">Primera semana</span>
						{:else if p.delta && IMPROVEMENT_VERDICTS.includes(p.delta.verdict)}
							<span class="badge badge-accent">{VERDICT_LABEL[p.delta.verdict]}</span>
							{#if p.delta.weight !== 0}<StatDelta value={p.delta.weight} unit=" {UNIT}" />{/if}
							{#if p.delta.reps !== 0}<StatDelta value={p.delta.reps} unit=" reps" />{/if}
							{#if p.delta.weight === 0 && p.delta.reps === 0 && p.delta.volume !== 0}
								<StatDelta value={p.delta.volume} unit=" vol" />
							{/if}
						{:else if p.delta && p.delta.verdict === 'baja'}
							<span class="badge badge-bad">Bajó</span>
						{:else}
							<span class="badge">Igual</span>
						{/if}
					</div>
				</div>
				<div class="ex-right">
					<Sparkline values={p.weeks.map((w) => w.bestE1rm)} />
					<Icon name="chevron" size={16} />
				</div>
			</a>
		{/each}
	</div>

	{#if data.untracked.length > 0}
		<h2 class="sub">Sin datos aún</h2>
		<div class="stack">
			{#each data.untracked as ex (ex.id)}
				<div class="card untracked">
					<span class="ex-name">{ex.name}</span>
					<span class="muted small">Regístralo para trackearlo</span>
				</div>
			{/each}
		</div>
	{/if}
{/if}

<style>
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
