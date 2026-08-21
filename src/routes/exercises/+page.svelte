<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { newEntityId, offlineData, queueOfflineMutation } from '$lib/offline/store';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import type { Exercise } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showNew = $state(false);
	let editingId = $state<string | null>(null);
	let mutationError = $state<string | null>(null);
	let pendingDelete = $state<{ id: string; name: string } | null>(null);
	let deleting = $state(false);
	const exercises = $derived($offlineData?.exercises ?? data.exercises);

	const MUSCLE_GROUPS = [
		'Chest',
		'Back',
		'Legs',
		'Shoulders',
		'Biceps',
		'Triceps',
		'Core',
		'Glutes',
		'Calves',
		'Forearms',
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

	function values(form: HTMLFormElement) {
		const data = new FormData(form);
		return {
			name: String(data.get('name') ?? '').trim(),
			muscleGroup: String(data.get('muscleGroup') ?? '').trim(),
			notes: String(data.get('notes') ?? '').trim()
		};
	}

	async function createExercise(event: SubmitEvent) {
		event.preventDefault();
		const payload = values(event.currentTarget as HTMLFormElement);
		if (!payload.name) return;
		try {
			await queueOfflineMutation('exercise', 'create', newEntityId(), payload);
			mutationError = null;
			closeForms();
		} catch (error) {
			mutationError = error instanceof Error ? error.message : 'Could not save your exercise';
		}
	}

	async function updateExercise(event: SubmitEvent, id: string) {
		event.preventDefault();
		const payload = values(event.currentTarget as HTMLFormElement);
		if (!payload.name) return;
		try {
			await queueOfflineMutation('exercise', 'update', id, payload);
			mutationError = null;
			closeForms();
		} catch (error) {
			mutationError = error instanceof Error ? error.message : 'Could not save your exercise';
		}
	}

	async function deleteExercise() {
		if (!pendingDelete || deleting) return;
		const target = pendingDelete;
		deleting = true;
		try {
			await queueOfflineMutation('exercise', 'delete', target.id);
			mutationError = null;
			closeForms();
		} catch (error) {
			mutationError = error instanceof Error ? error.message : 'Could not delete your exercise';
		} finally {
			pendingDelete = null;
			deleting = false;
		}
	}
</script>

<svelte:head><title>Exercises - Gym Tracker</title></svelte:head>

<PageHeader title="Exercises" subtitle="Your movement catalog">
	{#snippet action()}
		<button class="btn btn-primary" onclick={startNew}>
			<Icon name="plus" size={16} stroke={2.5} /> New
		</button>
	{/snippet}
</PageHeader>

{#if mutationError}<p class="form-error">{mutationError}</p>{/if}

<datalist id="muscle-groups">
	{#each MUSCLE_GROUPS as g (g)}
		<option value={g}></option>
	{/each}
</datalist>

{#snippet fields(ex: Exercise | null)}
	<div class="field">
		<label class="label" for="name-{ex?.id ?? 'new'}">Name</label>
		<input
			id="name-{ex?.id ?? 'new'}"
			name="name"
			class="input"
			placeholder="e.g. Bench press"
			value={ex?.name ?? ''}
			required
		/>
	</div>
	<div class="field">
		<label class="label" for="mg-{ex?.id ?? 'new'}">Muscle group</label>
		<input
			id="mg-{ex?.id ?? 'new'}"
			name="muscleGroup"
			class="input"
			list="muscle-groups"
			placeholder="e.g. Chest"
			value={ex?.muscleGroup ?? ''}
		/>
	</div>
	<div class="field">
		<label class="label" for="notes-{ex?.id ?? 'new'}">Notes (optional)</label>
		<input
			id="notes-{ex?.id ?? 'new'}"
			name="notes"
			class="input"
			placeholder="Grip, machine, tempo…"
			value={ex?.notes ?? ''}
		/>
	</div>
{/snippet}

{#if showNew}
	<form class="form-card" onsubmit={createExercise}>
		{@render fields(null)}
		<div class="form-actions">
			<button type="button" class="btn btn-subtle" onclick={closeForms}>Cancel</button>
			<button type="submit" class="btn btn-primary"><Icon name="check" size={16} /> Save</button>
		</div>
	</form>
{/if}

{#if exercises.length === 0 && !showNew}
	<EmptyState
		icon="dumbbell"
		title="No exercises yet"
		message="Create your first exercise to start building routines."
	>
		<button class="btn btn-primary" onclick={startNew}>
			<Icon name="plus" size={16} stroke={2.5} /> New exercise
		</button>
	</EmptyState>
{:else}
	<div class="exercise-ledger">
		<div class="exercise-head" aria-hidden="true">
			<span>Exercise</span>
			<span>Muscle group</span>
			<span>Notes</span>
			<span></span>
		</div>
		{#each exercises as ex (ex.id)}
			{#if editingId === ex.id}
				<form class="form-card inline-editor" onsubmit={(event) => updateExercise(event, ex.id)}>
					{@render fields(ex)}
					<div class="form-actions">
						<button
							type="button"
							class="btn btn-danger"
							onclick={() => (pendingDelete = { id: ex.id, name: ex.name })}
						>
							<Icon name="trash" size={15} /> Delete
						</button>
						<div class="spacer"></div>
						<button type="button" class="btn btn-subtle" onclick={closeForms}>Cancel</button>
						<button type="submit" class="btn btn-primary"
							><Icon name="check" size={16} /> Save</button
						>
					</div>
				</form>
			{:else}
				<div class="row">
					<span class="row-name">{ex.name}</span>
					<span class="row-muscle">{ex.muscleGroup || '—'}</span>
					<span class="row-notes">{ex.notes || '—'}</span>
					<button class="icon-action" aria-label="Edit" onclick={() => startEdit(ex)}>
						<Icon name="pencil" size={16} />
					</button>
				</div>
			{/if}
		{/each}
	</div>
{/if}

<ConfirmDialog
	open={pendingDelete !== null}
	title="Delete exercise?"
	message={pendingDelete
		? `“${pendingDelete.name}” will be removed from your exercise catalog. This cannot be undone.`
		: ''}
	confirmLabel="Delete exercise"
	busy={deleting}
	onCancel={() => (pendingDelete = null)}
	onConfirm={() => void deleteExercise()}
/>

<style>
	.form-card {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1rem;
		border: 1px solid var(--color-border);
		border-top: 3px solid var(--color-accent);
		border-radius: var(--radius-overlay);
		background: var(--color-surface-2);
	}
	.form-error {
		margin: 0 0 0.8rem;
		color: var(--color-bad);
		font-size: 0.85rem;
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
	.exercise-ledger {
		border-block: 1px solid var(--color-border);
	}
	.exercise-head,
	.row {
		display: grid;
		grid-template-columns: minmax(12rem, 1.4fr) minmax(8rem, 0.7fr) minmax(10rem, 1fr) 2.75rem;
		align-items: center;
		gap: 1rem;
	}
	.exercise-head {
		min-height: 2.5rem;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--color-border);
		color: var(--color-muted);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}
	.row {
		min-height: 3.5rem;
		padding: 0.625rem 0;
		border-bottom: 1px solid var(--color-border-soft);
	}
	.row:last-child {
		border-bottom: 0;
	}
	@media (hover: hover) {
		.row:hover {
			background: var(--color-surface);
		}
	}
	.inline-editor {
		margin: 0;
		border-top-width: 1px;
		border-radius: 0;
	}
	.row-name {
		font-weight: 600;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.row-muscle {
		color: var(--color-subtle);
		font-size: 0.82rem;
	}
	.row-notes {
		color: var(--color-muted);
		font-size: 0.82rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.icon-action {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: var(--radius-control);
		background: transparent;
		border: 1px solid transparent;
		color: var(--color-subtle);
		cursor: pointer;
		flex-shrink: 0;
		transition:
			color 0.15s ease,
			border-color 0.15s ease,
			transform 0.1s ease;
	}
	@media (hover: hover) {
		.icon-action:hover {
			background: var(--color-surface-2);
			color: var(--color-accent-bright);
		}
	}
	.icon-action:active {
		transform: scale(0.92);
		color: var(--color-accent-bright);
	}
	@media (max-width: 760px) {
		.exercise-head {
			display: none;
		}
		.row {
			grid-template-columns: minmax(0, 1fr) auto 2.75rem;
			gap: 0.75rem;
		}
		.row-name {
			grid-column: 1;
		}
		.row-muscle {
			grid-column: 2;
			text-align: right;
		}
		.row-notes {
			grid-column: 1 / 3;
			grid-row: 2;
		}
		.icon-action {
			grid-column: 3;
			grid-row: 1 / 3;
		}
	}
	@media (max-width: 460px) {
		.form-actions {
			flex-wrap: wrap;
		}
		.form-actions .spacer {
			display: none;
		}
		.form-actions .btn-primary {
			margin-left: auto;
		}
		.row-muscle {
			max-width: 7rem;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}
</style>
