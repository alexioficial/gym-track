<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import type { Exercise } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showNew = $state(false);
	let editingId = $state<string | null>(null);

	const MUSCLE_GROUPS = [
		'Pecho',
		'Espalda',
		'Piernas',
		'Hombros',
		'Bíceps',
		'Tríceps',
		'Core',
		'Glúteos',
		'Pantorrilla',
		'Antebrazo',
		'Cardio'
	];

	function startNew() {
		editingId = null;
		showNew = true;
	}
	function startEdit(ex: Exercise) {
		showNew = false;
		editingId = ex.id;
	}
	function closeForms() {
		showNew = false;
		editingId = null;
	}
</script>

<svelte:head><title>Ejercicios · Gym Tracker</title></svelte:head>

<PageHeader title="Ejercicios" subtitle="Tu catálogo de movimientos">
	{#snippet action()}
		<button class="btn btn-primary" onclick={startNew}>
			<Icon name="plus" size={16} stroke={2.5} /> Nuevo
		</button>
	{/snippet}
</PageHeader>

<datalist id="muscle-groups">
	{#each MUSCLE_GROUPS as g (g)}
		<option value={g}></option>
	{/each}
</datalist>

{#snippet fields(ex: Exercise | null)}
	<div class="field">
		<label class="label" for="name-{ex?.id ?? 'new'}">Nombre</label>
		<input
			id="name-{ex?.id ?? 'new'}"
			name="name"
			class="input"
			placeholder="Ej. Press banca"
			value={ex?.name ?? ''}
			required
		/>
	</div>
	<div class="field">
		<label class="label" for="mg-{ex?.id ?? 'new'}">Grupo muscular</label>
		<input
			id="mg-{ex?.id ?? 'new'}"
			name="muscleGroup"
			class="input"
			list="muscle-groups"
			placeholder="Ej. Pecho"
			value={ex?.muscleGroup ?? ''}
		/>
	</div>
	<div class="field">
		<label class="label" for="notes-{ex?.id ?? 'new'}">Notas (opcional)</label>
		<input
			id="notes-{ex?.id ?? 'new'}"
			name="notes"
			class="input"
			placeholder="Agarre, máquina, tempo…"
			value={ex?.notes ?? ''}
		/>
	</div>
{/snippet}

{#if showNew}
	<form
		method="POST"
		action="?/create"
		class="card form-card"
		use:enhance={() => async ({ update }) => {
			await update();
			closeForms();
		}}
	>
		{@render fields(null)}
		<div class="form-actions">
			<button type="button" class="btn btn-subtle" onclick={closeForms}>Cancelar</button>
			<button type="submit" class="btn btn-primary"><Icon name="check" size={16} /> Guardar</button>
		</div>
	</form>
{/if}

{#if data.exercises.length === 0 && !showNew}
	<EmptyState icon="dumbbell" title="Sin ejercicios" message="Crea tu primer ejercicio para empezar a armar rutinas.">
		<button class="btn btn-primary" onclick={startNew}>
			<Icon name="plus" size={16} stroke={2.5} /> Nuevo ejercicio
		</button>
	</EmptyState>
{:else}
	<div class="stack">
		{#each data.exercises as ex (ex.id)}
			{#if editingId === ex.id}
				<form
					method="POST"
					action="?/update"
					class="card form-card"
					use:enhance={() => async ({ update }) => {
						await update();
						closeForms();
					}}
				>
					<input type="hidden" name="id" value={ex.id} />
					{@render fields(ex)}
					<div class="form-actions">
						<button
							type="submit"
							formaction="?/delete"
							formnovalidate
							class="btn btn-danger"
							onclick={(e) => {
								if (!confirm(`¿Eliminar "${ex.name}"?`)) e.preventDefault();
							}}
						>
							<Icon name="trash" size={15} /> Eliminar
						</button>
						<div class="spacer"></div>
						<button type="button" class="btn btn-subtle" onclick={closeForms}>Cancelar</button>
						<button type="submit" class="btn btn-primary"><Icon name="check" size={16} /> Guardar</button>
					</div>
				</form>
			{:else}
				<div class="row card card-hover">
					<div class="row-info">
						<span class="row-name">{ex.name}</span>
						<div class="row-meta">
							{#if ex.muscleGroup}<span class="badge">{ex.muscleGroup}</span>{/if}
							{#if ex.notes}<span class="muted row-notes">{ex.notes}</span>{/if}
						</div>
					</div>
					<button class="icon-action" aria-label="Editar" onclick={() => startEdit(ex)}>
						<Icon name="pencil" size={16} />
					</button>
				</div>
			{/if}
		{/each}
	</div>
{/if}

<style>
	.stack {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.form-card {
		padding: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		margin-bottom: 0.6rem;
	}
	.field {
		display: flex;
		flex-direction: column;
	}
	.form-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}
	.spacer {
		flex: 1;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.9rem 1rem;
	}
	.row-info {
		flex: 1;
		min-width: 0;
	}
	.row-name {
		font-weight: 600;
	}
	.row-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.3rem;
	}
	.row-notes {
		font-size: 0.82rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.icon-action {
		display: grid;
		place-items: center;
		width: 2.1rem;
		height: 2.1rem;
		border-radius: 0.6rem;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		color: var(--color-subtle);
		cursor: pointer;
		flex-shrink: 0;
		transition:
			color 0.15s ease,
			border-color 0.15s ease;
	}
	.icon-action:hover {
		color: var(--color-accent-bright);
		border-color: var(--color-accent);
	}
</style>
