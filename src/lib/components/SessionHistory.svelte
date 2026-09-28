<script lang="ts">
	import { untrack } from 'svelte';
	import EmptyState from './EmptyState.svelte';
	import { formatDate } from '$lib/utils/progression';
	import { formatLoad, type WeightUnit } from '$lib/units';
	import type { Exercise, Routine, Session } from '$lib/types';

	interface Props {
		sessions: Session[];
		exercises: Exercise[];
		routines: Routine[];
		unit: WeightUnit;
		pageSize?: number;
	}

	let { sessions, exercises, routines, unit, pageSize = 20 }: Props = $props();

	let shown = $state(untrack(() => pageSize));

	const exerciseNames = $derived(new Map(exercises.map((item) => [item.id, item.name])));
	const routineById = $derived(new Map(routines.map((item) => [item.id, item])));
	const visible = $derived(sessions.slice(0, shown));

	function setCount(session: Session): number {
		return session.entries.reduce((total, entry) => total + entry.sets.length, 0);
	}
</script>

{#if sessions.length === 0}
	<EmptyState icon="history" title="Sin sesiones" message="Todavía no hay sesiones registradas." />
{:else}
	<div class="ledger-section history">
		{#each visible as session (session.id)}
			{@const routine = session.routineId ? routineById.get(session.routineId) : undefined}
			<details class="session">
				<summary>
					<span class="dot" style="background:{routine?.color ?? 'var(--color-muted)'}"></span>
					<span class="info">
						<span class="routine">{routine?.name ?? 'Sesión libre'}</span>
						<span class="muted small">{formatDate(session.date)}</span>
					</span>
					<span class="muted small stat-num"
						>{session.entries.length} ej. · {setCount(session)}
						{setCount(session) === 1 ? 'serie' : 'series'}</span
					>
				</summary>
				<ul class="entries">
					{#each session.entries as entry, index (index)}
						<li>
							<span class="exercise"
								>{exerciseNames.get(entry.exerciseId) ?? 'Ejercicio borrado'}</span
							>
							<span class="sets stat-num">
								{#each entry.sets as set, setIndex (setIndex)}
									<span>{formatLoad(set.weight, unit)} {unit} × {set.reps}</span>
								{/each}
							</span>
						</li>
					{/each}
				</ul>
				{#if session.notes}<p class="notes muted">{session.notes}</p>{/if}
			</details>
		{/each}
	</div>
	{#if sessions.length > shown}
		<button type="button" class="btn btn-subtle more" onclick={() => (shown += pageSize)}>
			Ver más ({sessions.length - shown})
		</button>
	{/if}
{/if}

<style>
	.history {
		background: none;
	}
	.session {
		border-bottom: 1px solid var(--color-border-soft);
	}
	.session:last-child {
		border-bottom: 0;
	}
	summary {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.8rem 0;
		cursor: pointer;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	.dot {
		width: 0.6rem;
		height: 0.6rem;
		flex-shrink: 0;
		border-radius: 999px;
	}
	.info {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;
	}
	.routine {
		font-weight: 600;
	}
	.small {
		font-size: 0.78rem;
	}
	.entries {
		display: grid;
		gap: 0.55rem;
		margin: 0 0 0.9rem 1.35rem;
		padding: 0;
		list-style: none;
		font-size: 0.88rem;
	}
	.entries li {
		display: grid;
		gap: 0.15rem;
	}
	.exercise {
		font-weight: 600;
	}
	.sets {
		display: flex;
		flex-wrap: wrap;
		gap: 0.2rem 0.9rem;
		color: var(--color-subtle);
	}
	.notes {
		margin: 0 0 0.9rem 1.35rem;
		font-size: 0.85rem;
	}
	.more {
		margin-top: 1rem;
	}
</style>
