<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { ROUTINE_COLORS, WEEKDAYS, WEEKDAY_LABELS, type Routine } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showNew = $state(false);
	let editingId = $state<string | null>(null);

	const exerciseName = $derived(new Map(data.exercises.map((e) => [e.id, e.name])));
	const routineById = $derived(new Map(data.routines.map((r) => [r.id, r])));

	function startNew() {
		editingId = null;
		showNew = true;
	}
	function startEdit(id: string) {
		showNew = false;
		editingId = id;
	}
	function close() {
		showNew = false;
		editingId = null;
	}
</script>

<svelte:head><title>Rutinas · Gym Tracker</title></svelte:head>

<PageHeader title="Rutinas" subtitle="Arma tus rutinas y asígnalas a la semana">
	{#snippet action()}
		<button class="btn btn-primary" onclick={startNew}>
			<Icon name="plus" size={16} stroke={2.5} /> Nueva
		</button>
	{/snippet}
</PageHeader>

<!-- Calendario semanal -->
<section class="block">
	<h2 class="block-title"><Icon name="calendar" size={17} /> Semana</h2>
	<div class="card week">
		{#each WEEKDAYS as day (day)}
			{@const assigned = data.schedule[day] ? routineById.get(data.schedule[day]!) : null}
			<div class="day-row">
				<span class="day-color" style="background:{assigned?.color ?? 'var(--color-border)'}"></span>
				<span class="day-name">{WEEKDAY_LABELS[day]}</span>
				<form method="POST" action="?/setDay" use:enhance class="day-form">
					<input type="hidden" name="day" value={day} />
					<select
						name="routineId"
						class="input day-select"
						onchange={(e) => e.currentTarget.form?.requestSubmit()}
					>
						<option value="" selected={!data.schedule[day]}>Descanso</option>
						{#each data.routines as r (r.id)}
							<option value={r.id} selected={data.schedule[day] === r.id}>{r.name}</option>
						{/each}
					</select>
				</form>
			</div>
		{/each}
	</div>
</section>

<!-- Formulario de rutina (fields reutilizables) -->
{#snippet routineFields(routine: Routine | null)}
	<div class="field">
		<label class="label" for="rname-{routine?.id ?? 'new'}">Nombre de la rutina</label>
		<input
			id="rname-{routine?.id ?? 'new'}"
			name="name"
			class="input"
			placeholder="Ej. Empuje, Torso, Pierna A…"
			value={routine?.name ?? ''}
			required
		/>
	</div>

	<div class="field">
		<span class="label">Color</span>
		<div class="colors">
			{#each ROUTINE_COLORS as color, i (color)}
				<label class="swatch" style="--c:{color}">
					<input
						type="radio"
						name="color"
						value={color}
						checked={routine ? routine.color === color : i === 0}
					/>
					<span class="swatch-dot"></span>
				</label>
			{/each}
		</div>
	</div>

	<div class="field">
		<span class="label">Ejercicios de esta rutina</span>
		{#if data.exercises.length === 0}
			<p class="muted hint">Primero crea ejercicios en la pestaña <a href="/exercises" class="accent">Ejercicios</a>.</p>
		{:else}
			<div class="checks">
				{#each data.exercises as ex (ex.id)}
					<label class="check">
						<input
							type="checkbox"
							name="exerciseIds"
							value={ex.id}
							checked={routine?.exerciseIds.includes(ex.id) ?? false}
						/>
						<span class="check-box"><Icon name="check" size={13} stroke={3} /></span>
						<span class="check-label">{ex.name}</span>
						{#if ex.muscleGroup}<span class="muted check-mg">{ex.muscleGroup}</span>{/if}
					</label>
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

{#if showNew}
	<form
		method="POST"
		action="?/create"
		class="card form-card"
		use:enhance={() => async ({ update }) => {
			await update();
			close();
		}}
	>
		{@render routineFields(null)}
		<div class="form-actions">
			<button type="button" class="btn btn-subtle" onclick={close}>Cancelar</button>
			<button type="submit" class="btn btn-primary"><Icon name="check" size={16} /> Crear rutina</button>
		</div>
	</form>
{/if}

<!-- Lista de rutinas -->
<section class="block">
	<h2 class="block-title"><Icon name="clipboard" size={17} /> Tus rutinas</h2>

	{#if data.routines.length === 0 && !showNew}
		<EmptyState icon="calendar" title="Sin rutinas" message="Crea una rutina y asígnale ejercicios.">
			<button class="btn btn-primary" onclick={startNew}>
				<Icon name="plus" size={16} stroke={2.5} /> Nueva rutina
			</button>
		</EmptyState>
	{:else}
		<div class="stack">
			{#each data.routines as routine (routine.id)}
				{#if editingId === routine.id}
					<form
						method="POST"
						action="?/update"
						class="card form-card"
						use:enhance={() => async ({ update }) => {
							await update();
							close();
						}}
					>
						<input type="hidden" name="id" value={routine.id} />
						{@render routineFields(routine)}
						<div class="form-actions">
							<button
								type="submit"
								formaction="?/delete"
								formnovalidate
								class="btn btn-danger"
								onclick={(e) => {
									if (!confirm(`¿Eliminar la rutina "${routine.name}"?`)) e.preventDefault();
								}}
							>
								<Icon name="trash" size={15} /> Eliminar
							</button>
							<div class="spacer"></div>
							<button type="button" class="btn btn-subtle" onclick={close}>Cancelar</button>
							<button type="submit" class="btn btn-primary"><Icon name="check" size={16} /> Guardar</button>
						</div>
					</form>
				{:else}
					<div class="card routine">
						<div class="routine-head">
							<span class="dot" style="background:{routine.color}"></span>
							<span class="routine-name">{routine.name}</span>
							<button class="icon-action" aria-label="Editar" onclick={() => startEdit(routine.id)}>
								<Icon name="pencil" size={16} />
							</button>
						</div>
						{#if routine.exerciseIds.length > 0}
							<div class="chips">
								{#each routine.exerciseIds as id (id)}
									{#if exerciseName.has(id)}
										<span class="chip">{exerciseName.get(id)}</span>
									{/if}
								{/each}
							</div>
						{:else}
							<p class="muted hint">Sin ejercicios asignados</p>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</section>

<style>
	.block {
		margin-top: 1.5rem;
	}
	.block-title {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--color-accent-bright);
		margin-bottom: 0.75rem;
	}

	.week {
		overflow: hidden;
	}
	.day-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 0.85rem;
		border-bottom: 1px solid var(--color-border-soft);
	}
	.day-row:last-child {
		border-bottom: none;
	}
	.day-color {
		width: 0.35rem;
		height: 1.6rem;
		border-radius: 999px;
		flex-shrink: 0;
	}
	.day-name {
		font-weight: 600;
		font-size: 0.9rem;
		width: 5.5rem;
		flex-shrink: 0;
	}
	.day-form {
		flex: 1;
	}
	.day-select {
		padding: 0.45rem 0.6rem;
		font-size: 0.88rem;
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.form-card {
		padding: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 0.6rem;
	}
	.field {
		display: flex;
		flex-direction: column;
	}
	.hint {
		font-size: 0.85rem;
	}

	.colors {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.swatch {
		cursor: pointer;
	}
	.swatch input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.swatch-dot {
		display: block;
		width: 1.7rem;
		height: 1.7rem;
		border-radius: 999px;
		background: var(--c);
		border: 2px solid transparent;
		box-shadow: 0 0 0 2px var(--color-surface);
		transition: transform 0.12s ease;
	}
	.swatch input:checked + .swatch-dot {
		border-color: var(--color-text);
		transform: scale(1.12);
	}

	.checks {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		max-height: 15rem;
		overflow-y: auto;
	}
	.check {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.5rem 0.6rem;
		border-radius: 0.6rem;
		background: var(--color-surface-2);
		border: 1px solid transparent;
		cursor: pointer;
		transition: border-color 0.12s ease;
	}
	@media (hover: hover) {
		.check:hover {
			border-color: var(--color-border);
		}
	}
	.check input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.check-box {
		display: grid;
		place-items: center;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 0.4rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
		color: transparent;
		flex-shrink: 0;
		transition:
			background 0.12s ease,
			color 0.12s ease;
	}
	.check input:checked + .check-box {
		background: var(--color-accent);
		border-color: var(--color-accent);
		color: #0a0a0a;
	}
	.check-label {
		font-size: 0.9rem;
		font-weight: 500;
		flex: 1;
	}
	.check-mg {
		font-size: 0.75rem;
	}

	.form-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.spacer {
		flex: 1;
	}

	.routine {
		padding: 1rem;
	}
	.routine-head {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.dot {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 999px;
		flex-shrink: 0;
	}
	.routine-name {
		font-weight: 700;
		font-size: 1.05rem;
		flex: 1;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.75rem;
	}
	.chip {
		font-size: 0.78rem;
		font-weight: 500;
		padding: 0.25rem 0.6rem;
		border-radius: 999px;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		color: var(--color-subtle);
	}

	.icon-action {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 0.6rem;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
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
			color: var(--color-accent-bright);
			border-color: var(--color-accent);
		}
	}
	.icon-action:active {
		transform: scale(0.92);
		color: var(--color-accent-bright);
	}
</style>
