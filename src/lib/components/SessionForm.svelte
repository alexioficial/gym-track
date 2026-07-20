<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from './Icon.svelte';
	import { UNIT, type Exercise, type Routine, type Session } from '$lib/types';
	import { todayYmd } from '$lib/utils/progression';

	interface Props {
		exercises: Exercise[];
		routines: Routine[];
		mode: 'create' | 'edit';
		session?: Session | null;
		initialRoutineId?: string;
	}
	let { exercises, routines, mode, session = null, initialRoutineId = '' }: Props = $props();

	type EditSet = { id: number; weight: number | null; reps: number | null };
	type EditEntry = { exerciseId: string; sets: EditSet[] };

	let counter = 0;
	const nextId = () => ++counter;

	function initEntries(): EditEntry[] {
		if (session) {
			return session.entries.map((e) => ({
				exerciseId: e.exerciseId,
				sets: e.sets.map((s) => ({ id: nextId(), weight: s.weight, reps: s.reps }))
			}));
		}
		// Al crear con una rutina preseleccionada, precargamos sus ejercicios.
		const routine = routines.find((r) => r.id === initialRoutineId);
		if (routine) {
			return routine.exerciseIds
				.filter((id) => exercises.some((e) => e.id === id))
				.map((id) => ({ exerciseId: id, sets: [{ id: nextId(), weight: null, reps: null }] }));
		}
		return [];
	}

	let date = $state(session?.date ?? todayYmd());
	let routineId = $state(session?.routineId ?? initialRoutineId ?? '');
	let notes = $state(session?.notes ?? '');
	let entries = $state<EditEntry[]>(initEntries());
	let pick = $state('');

	const exerciseName = $derived(new Map(exercises.map((e) => [e.id, e.name])));
	const exerciseMg = $derived(new Map(exercises.map((e) => [e.id, e.muscleGroup])));
	const usedIds = $derived(new Set(entries.map((e) => e.exerciseId)));
	const available = $derived(exercises.filter((e) => !usedIds.has(e.id)));
	const selectedRoutine = $derived(routines.find((r) => r.id === routineId) ?? null);

	const payload = $derived(
		entries
			.map((e) => ({
				exerciseId: e.exerciseId,
				sets: e.sets
					.map((s) => ({ weight: Number(s.weight ?? 0), reps: Number(s.reps ?? 0) }))
					.filter((s) => s.reps > 0 && s.weight >= 0)
			}))
			.filter((e) => e.sets.length > 0)
	);
	const canSave = $derived(payload.length > 0 && !!date);

	function addExercise(id: string) {
		if (!id || usedIds.has(id)) return;
		entries.push({ exerciseId: id, sets: [{ id: nextId(), weight: null, reps: null }] });
		pick = '';
	}

	function loadRoutine() {
		if (!selectedRoutine) return;
		for (const id of selectedRoutine.exerciseIds) {
			if (!usedIds.has(id)) {
				entries.push({ exerciseId: id, sets: [{ id: nextId(), weight: null, reps: null }] });
			}
		}
	}

	function removeEntry(exerciseId: string) {
		entries = entries.filter((e) => e.exerciseId !== exerciseId);
	}

	function addSet(entry: EditEntry) {
		const last = entry.sets.at(-1);
		entry.sets.push({ id: nextId(), weight: last?.weight ?? null, reps: last?.reps ?? null });
	}

	function removeSet(entry: EditEntry, setId: number) {
		entry.sets = entry.sets.filter((s) => s.id !== setId);
	}
</script>

<form method="POST" action={mode === 'create' ? '?/create' : '?/update'} use:enhance>
	{#if mode === 'edit' && session}
		<input type="hidden" name="id" value={session.id} />
	{/if}
	<input type="hidden" name="entries" value={JSON.stringify(payload)} />

	<div class="top card">
		<div class="field">
			<label class="label" for="date">Fecha</label>
			<input id="date" name="date" type="date" class="input" bind:value={date} required />
		</div>
		<div class="field">
			<label class="label" for="routine">Rutina</label>
			<select id="routine" name="routineId" class="input" bind:value={routineId}>
				<option value="">Sesión libre</option>
				{#each routines as r (r.id)}
					<option value={r.id}>{r.name}</option>
				{/each}
			</select>
		</div>
		{#if selectedRoutine}
			<button type="button" class="btn btn-ghost load-btn" onclick={loadRoutine}>
				<Icon name="plus" size={15} stroke={2.5} /> Cargar ejercicios de {selectedRoutine.name}
			</button>
		{/if}
	</div>

	<!-- Ejercicios -->
	<div class="entries">
		{#each entries as entry (entry.exerciseId)}
			<div class="entry card">
				<div class="entry-head">
					<div class="entry-title">
						<span class="entry-name">{exerciseName.get(entry.exerciseId) ?? 'Ejercicio'}</span>
						{#if exerciseMg.get(entry.exerciseId)}
							<span class="muted entry-mg">{exerciseMg.get(entry.exerciseId)}</span>
						{/if}
					</div>
					<button
						type="button"
						class="icon-action"
						aria-label="Quitar ejercicio"
						onclick={() => removeEntry(entry.exerciseId)}
					>
						<Icon name="x" size={16} />
					</button>
				</div>

				<div class="sets">
					<div class="set-head muted">
						<span>#</span>
						<span>Peso ({UNIT})</span>
						<span>Reps</span>
						<span></span>
					</div>
					{#each entry.sets as set, i (set.id)}
						<div class="set-row">
							<span class="set-n stat-num">{i + 1}</span>
							<input
								type="number"
								inputmode="decimal"
								step="0.5"
								min="0"
								class="input set-input"
								placeholder="0"
								bind:value={set.weight}
							/>
							<input
								type="number"
								inputmode="numeric"
								step="1"
								min="0"
								class="input set-input"
								placeholder="0"
								bind:value={set.reps}
							/>
							<button
								type="button"
								class="set-del"
								aria-label="Quitar set"
								onclick={() => removeSet(entry, set.id)}
							>
								<Icon name="minus" size={15} />
							</button>
						</div>
					{/each}
				</div>

				<button type="button" class="btn btn-subtle add-set" onclick={() => addSet(entry)}>
					<Icon name="plus" size={14} stroke={2.5} /> Añadir set
				</button>
			</div>
		{/each}
	</div>

	<!-- Añadir ejercicio -->
	{#if available.length > 0}
		<div class="add-ex card">
			<select class="input" bind:value={pick}>
				<option value="">Añadir ejercicio…</option>
				{#each available as ex (ex.id)}
					<option value={ex.id}>{ex.name}</option>
				{/each}
			</select>
			<button type="button" class="btn btn-primary" disabled={!pick} onclick={() => addExercise(pick)}>
				<Icon name="plus" size={16} stroke={2.5} /> Añadir
			</button>
		</div>
	{:else if entries.length === 0}
		<p class="muted empty-note">
			No tienes ejercicios. Créalos en <a href="/exercises" class="accent">Ejercicios</a>.
		</p>
	{/if}

	<div class="field">
		<label class="label" for="notes">Notas (opcional)</label>
		<input id="notes" name="notes" class="input" placeholder="Cómo te sentiste, molestias…" bind:value={notes} />
	</div>

	<div class="submit-row">
		{#if mode === 'edit'}
			<button
				type="submit"
				formaction="?/delete"
				formnovalidate
				class="btn btn-danger"
				onclick={(e) => {
					if (!confirm('¿Eliminar esta sesión?')) e.preventDefault();
				}}
			>
				<Icon name="trash" size={15} /> Eliminar
			</button>
		{/if}
		<div class="spacer"></div>
		<button type="submit" class="btn btn-primary save-btn" disabled={!canSave}>
			<Icon name="check" size={17} stroke={2.5} /> Guardar sesión
		</button>
	</div>
</form>

<style>
	.top {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		margin-bottom: 1rem;
	}
	.field {
		display: flex;
		flex-direction: column;
	}
	.load-btn {
		justify-content: flex-start;
		font-size: 0.85rem;
	}

	.entries {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}
	.entry {
		padding: 0.9rem 1rem 1rem;
	}
	.entry-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}
	.entry-title {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		min-width: 0;
	}
	.entry-name {
		font-weight: 700;
		font-size: 1.02rem;
	}
	.entry-mg {
		font-size: 0.75rem;
	}

	.sets {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.set-head,
	.set-row {
		display: grid;
		grid-template-columns: 1.6rem 1fr 1fr 2.2rem;
		align-items: center;
		gap: 0.5rem;
	}
	.set-head {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 0 0.1rem;
	}
	.set-n {
		text-align: center;
		font-weight: 700;
		color: var(--color-muted);
	}
	.set-input {
		text-align: center;
		padding: 0.55rem 0.4rem;
		font-size: 1rem;
		font-variant-numeric: tabular-nums;
	}
	.set-del {
		display: grid;
		place-items: center;
		height: 2.1rem;
		border-radius: 0.55rem;
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-muted);
		cursor: pointer;
	}
	.set-del:hover {
		color: var(--color-bad);
		border-color: color-mix(in srgb, var(--color-bad) 40%, transparent);
	}
	.add-set {
		margin-top: 0.75rem;
		width: 100%;
		font-size: 0.85rem;
	}

	.add-ex {
		display: flex;
		gap: 0.5rem;
		padding: 0.75rem;
		margin-top: 0.8rem;
	}
	.add-ex .input {
		flex: 1;
	}
	.empty-note {
		margin-top: 0.8rem;
		font-size: 0.9rem;
	}

	.field {
		margin-top: 1rem;
	}

	.submit-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1.25rem;
	}
	.spacer {
		flex: 1;
	}
	.save-btn {
		padding: 0.8rem 1.4rem;
	}

	.icon-action {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border-radius: 0.55rem;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		color: var(--color-muted);
		cursor: pointer;
		flex-shrink: 0;
	}
	.icon-action:hover {
		color: var(--color-bad);
		border-color: color-mix(in srgb, var(--color-bad) 40%, transparent);
	}
</style>
