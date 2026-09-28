<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from './Icon.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import type { Exercise, LastPerformance, Routine, Session } from '$lib/types';
	import { offlineData, weightUnitOf } from '$lib/offline/store';
	import {
		LB_PER_KG,
		formatLoad,
		isWeightUnit,
		storedWeight,
		weightField,
		type WeightField
	} from '$lib/units';
	import { shortLabel, todayYmd } from '$lib/utils/progression';
	import { missingExerciseOccurrences } from '$lib/utils/routines';
	import {
		MAX_REPS,
		MAX_SESSION_ENTRIES,
		MAX_SETS_PER_ENTRY,
		MAX_WEIGHT,
		NAME_MAX,
		NOTES_MAX,
		sessionProblem
	} from '$lib/limits';

	interface Props {
		exercises: Exercise[];
		routines: Routine[];
		mode: 'create' | 'edit';
		session?: Session | null;
		initialRoutineId?: string;
		onSave: (input: {
			date: string;
			routineId: string | null;
			notes: string | undefined;
			entries: Array<{ exerciseId: string; sets: Array<{ weight: number; reps: number }> }>;
		}) => Promise<void>;
		onDelete?: () => Promise<void>;
		/** Reference: what the user did the last time they logged each exercise. */
		lastByExercise?: Record<string, LastPerformance>;
		/** Where the unsaved draft lives; a coach keeps one per client. */
		draftKey?: string;
		/** Lets the form add a new exercise to the catalogue; returns its id. */
		onCreateExercise?: (input: { name: string; muscleGroup: string }) => Promise<string>;
	}
	let {
		exercises,
		routines,
		mode,
		session = null,
		initialRoutineId = '',
		lastByExercise = {},
		draftKey,
		onCreateExercise,
		onSave,
		onDelete
	}: Props = $props();
	// A session form is deliberately initialized from its input once. Pages key this
	// component by session id, so a client-side navigation creates a fresh form.
	function initialProps() {
		return { session, routineId: initialRoutineId };
	}
	const initial = initialProps();

	/** Trim a value for display: "135", "5.5" — no trailing ".0". */
	const fmt = (n: number) => String(Math.round(n * 100) / 100);

	// Fixed for the life of the form: typed values are read in the unit they were typed in.
	const unit = weightUnitOf(get(offlineData), page.data.user);
	const maxWeight = unit === 'kg' ? Math.floor(MAX_WEIGHT / LB_PER_KG) : MAX_WEIGHT;

	type EditSet = WeightField & { id: number; reps: number | null };
	const emptySet = (): EditSet => ({ id: nextId(), ...weightField(null, unit), reps: null });
	type EditEntry = { id: number; exerciseId: string; sets: EditSet[] };

	let counter = 0;
	const nextId = () => ++counter;

	function initEntries(): EditEntry[] {
		if (initial.session) {
			return initial.session.entries.map((e) => ({
				id: nextId(),
				exerciseId: e.exerciseId,
				sets: e.sets.map((s) => ({ id: nextId(), ...weightField(s.weight, unit), reps: s.reps }))
			}));
		}
		// When creating with a preselected routine, preload its exercises + planned sets.
		const routine = routines.find((r) => r.id === initial.routineId);
		if (routine) {
			return routine.exercises
				.filter((re) => exercises.some((e) => e.id === re.exerciseId))
				.map(routineEntry);
		}
		return [];
	}

	let date = $state(initial.session?.date ?? todayYmd());
	let routineId = $state(initial.session?.routineId ?? initial.routineId ?? '');
	let notes = $state(initial.session?.notes ?? '');
	let entries = $state<EditEntry[]>(initEntries());
	let pick = $state('');

	const exerciseName = $derived(new Map(exercises.map((e) => [e.id, e.name])));
	const exerciseMg = $derived(new Map(exercises.map((e) => [e.id, e.muscleGroup])));
	const selectedRoutine = $derived(routines.find((r) => r.id === routineId) ?? null);
	// Planned occurrences from the selected routine that aren't in the session yet.
	const missingFromRoutine = $derived(
		selectedRoutine
			? missingExerciseOccurrences(
					selectedRoutine.exercises.filter((re) => exercises.some((e) => e.id === re.exerciseId)),
					entries
				)
			: []
	);
	// Any set with a value typed in — used to decide whether it's safe to replace entries.
	const hasData = $derived(
		entries.some((e) => e.sets.some((s) => s.weight != null || s.reps != null))
	);

	const payload = $derived(
		entries
			.map((e) => ({
				exerciseId: e.exerciseId,
				sets: e.sets
					.map((s) => ({ weight: storedWeight(s, unit), reps: Number(s.reps ?? 0) }))
					.filter((s) => s.reps > 0 && s.weight >= 0)
			}))
			.filter((e) => e.sets.length > 0)
	);
	const canSave = $derived(payload.length > 0 && !!date);
	let mutationError = $state<string | null>(null);
	let saving = $state(false);
	let deletePending = $state(false);
	let deleting = $state(false);

	// ---- Draft autosave (create mode only) ----
	// The gym is used on a phone: if the screen is left mid-log (navigate away,
	// app backgrounded, tab reloaded) the in-memory state would be lost. We mirror
	// the working session to localStorage as it changes and restore it on return.
	// Scoped per user so a shared device never offers one person's draft to another.
	const DRAFT_KEY = untrack(() => draftKey) ?? `gym:log-draft:${page.data.user?.id ?? 'anonymous'}`;
	const DRAFT_MAX_AGE = 1000 * 60 * 60 * 24 * 2; // ignore drafts older than 2 days
	let loaded = $state(false);
	let draftRecovered = $state(false);

	function clearDraft() {
		draftRecovered = false;
		if (browser) localStorage.removeItem(DRAFT_KEY);
	}

	function discardDraft() {
		clearDraft();
		date = todayYmd();
		routineId = initialRoutineId ?? '';
		notes = '';
		entries = initEntries();
		pick = '';
	}

	onMount(() => {
		if (mode !== 'create') {
			loaded = true;
			return;
		}
		try {
			const raw = localStorage.getItem(DRAFT_KEY);
			if (raw) {
				const d = JSON.parse(raw);
				const fresh = d && typeof d.savedAt === 'number' && Date.now() - d.savedAt < DRAFT_MAX_AGE;
				// Drafts from before units existed were typed in pounds.
				const draftUnit = isWeightUnit(d?.unit) ? d.unit : 'lb';
				const restoreSet = (s: Partial<EditSet> | null): EditSet => {
					const field: WeightField = {
						weight: typeof s?.weight === 'number' ? s.weight : null,
						storedLb: typeof s?.storedLb === 'number' ? s.storedLb : null,
						shown: typeof s?.shown === 'number' ? s.shown : null
					};
					const lb = field.weight === null ? null : storedWeight(field, draftUnit);
					return { id: nextId(), ...weightField(lb, unit), reps: s?.reps ?? null };
				};
				const restored: EditEntry[] = Array.isArray(d?.entries)
					? d.entries
							.filter((e: EditEntry) => e && exercises.some((x) => x.id === e.exerciseId))
							.map((e: EditEntry) => ({
								id: nextId(),
								exerciseId: String(e.exerciseId),
								sets: (Array.isArray(e.sets) ? e.sets : []).map(restoreSet)
							}))
					: [];
				const typed = restored.some((e) => e.sets.some((s) => s.weight != null || s.reps != null));
				if (fresh && typed) {
					if (typeof d.date === 'string') date = d.date;
					if (typeof d.routineId === 'string') routineId = d.routineId;
					if (typeof d.notes === 'string') notes = d.notes;
					entries = restored;
					draftRecovered = true;
				} else {
					localStorage.removeItem(DRAFT_KEY);
				}
			}
		} catch {
			// ignore a corrupt draft
		}
		loaded = true;
	});

	$effect(() => {
		if (mode !== 'create' || !browser) return;
		// Read reactive state so this effect re-runs when the working session changes.
		const snapshot = JSON.stringify({
			savedAt: Date.now(),
			unit,
			date,
			routineId,
			notes,
			entries
		});
		const meaningful = hasData;
		if (!loaded) return; // don't write (or clobber) until the initial draft load ran
		if (meaningful) localStorage.setItem(DRAFT_KEY, snapshot);
		else localStorage.removeItem(DRAFT_KEY);
	});

	let newExerciseName = $state('');
	let creatingExercise = $state(false);

	async function createExercise() {
		const name = newExerciseName.trim();
		if (!name || !onCreateExercise || creatingExercise) return;
		creatingExercise = true;
		try {
			addExercise(await onCreateExercise({ name, muscleGroup: '' }));
			newExerciseName = '';
		} catch (error) {
			mutationError = error instanceof Error ? error.message : 'No se pudo crear el ejercicio';
		} finally {
			creatingExercise = false;
		}
	}

	function addExercise(id: string) {
		if (!id) return;
		entries.push({
			id: nextId(),
			exerciseId: id,
			sets: [emptySet()]
		});
		pick = '';
	}

	// Build an entry with the routine's planned number of (empty) set rows.
	function routineEntry(re: { exerciseId: string; sets: number }): EditEntry {
		const n = Math.max(1, re.sets);
		return {
			id: nextId(),
			exerciseId: re.exerciseId,
			sets: Array.from({ length: n }, emptySet)
		};
	}

	// Add only the routine occurrences that aren't already represented in the session.
	function loadRoutine() {
		if (!selectedRoutine) return;
		const planned = selectedRoutine.exercises.filter((re) =>
			exercises.some((e) => e.id === re.exerciseId)
		);
		for (const re of missingExerciseOccurrences(planned, entries)) {
			entries.push(routineEntry(re));
		}
	}

	// When picking a routine: if nothing has been typed yet, replace the list with
	// exactly this routine's exercises; otherwise just add the missing ones.
	function onRoutineChange() {
		if (!selectedRoutine) return;
		const list = selectedRoutine.exercises.filter((re) =>
			exercises.some((e) => e.id === re.exerciseId)
		);
		if (!hasData) {
			entries = list.map(routineEntry);
		} else {
			loadRoutine();
		}
	}

	function removeEntry(id: number) {
		entries = entries.filter((e) => e.id !== id);
	}

	function addSet(entry: EditEntry) {
		const last = entry.sets.at(-1);
		entry.sets.push(last ? { ...last, id: nextId() } : emptySet());
	}

	function removeSet(entry: EditEntry, setId: number) {
		entry.sets = entry.sets.filter((s) => s.id !== setId);
	}

	async function save() {
		if (!canSave || saving) return;
		const input = {
			date,
			routineId: routineId || null,
			notes: notes.trim() || undefined,
			entries: payload
		};
		const problem = sessionProblem(input);
		if (problem) {
			mutationError = problem;
			return;
		}
		saving = true;
		try {
			await onSave(input);
			if (mode === 'create') clearDraft();
			mutationError = null;
		} catch (error) {
			mutationError = error instanceof Error ? error.message : 'No se pudo guardar tu sesión';
		} finally {
			saving = false;
		}
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		void save();
	}

	async function remove() {
		if (!onDelete || deleting) return;
		deleting = true;
		try {
			await onDelete();
			mutationError = null;
		} catch (error) {
			mutationError = error instanceof Error ? error.message : 'No se pudo borrar tu sesión';
		} finally {
			deletePending = false;
			deleting = false;
		}
	}
</script>

<form onsubmit={submit}>
	{#if draftRecovered}
		<div class="draft-banner">
			<Icon name="clipboard" size={16} />
			<span class="draft-text">Recuperamos tu sesión sin guardar.</span>
			<button type="button" class="draft-discard" onclick={discardDraft}>Descartar</button>
		</div>
	{/if}
	{#if mutationError}<p class="form-error" aria-live="polite">{mutationError}</p>{/if}

	<div class="top">
		<div class="field">
			<label class="label" for="date">Fecha</label>
			<input id="date" name="date" type="date" class="input" bind:value={date} required />
		</div>
		<div class="field">
			<label class="label" for="routine">Rutina</label>
			<select
				id="routine"
				name="routineId"
				class="input"
				bind:value={routineId}
				onchange={onRoutineChange}
			>
				<option value="">Sesión libre</option>
				{#each routines as r (r.id)}
					<option value={r.id}>{r.name}</option>
				{/each}
			</select>
		</div>
		{#if selectedRoutine && missingFromRoutine.length > 0}
			<button type="button" class="btn btn-ghost load-btn" onclick={loadRoutine}>
				<Icon name="plus" size={15} stroke={2.5} />
				Añadir {missingFromRoutine.length}
				{missingFromRoutine.length === 1 ? 'ejercicio' : 'ejercicios'} de {selectedRoutine.name}
			</button>
		{/if}
	</div>

	<!-- Exercises -->
	<div class="entries">
		{#each entries as entry (entry.id)}
			<div class="entry">
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
						onclick={() => removeEntry(entry.id)}
					>
						<Icon name="x" size={16} />
					</button>
				</div>

				{#if lastByExercise[entry.exerciseId]}
					{@const last = lastByExercise[entry.exerciseId]}
					<div class="last-ref" title="Supera esto para progresar">
						<Icon name="history" size={13} />
						<span class="last-label">Última vez · {shortLabel(last.date)}</span>
						<span class="last-sets">
							{#each last.sets as s, i (i)}
								<span class="last-set"
									>{formatLoad(s.weight, unit)}<span class="ls-x">×</span>{fmt(s.reps)}</span
								>
							{/each}
						</span>
					</div>
				{/if}

				<div class="sets">
					<div class="set-head muted">
						<span>#</span>
						<span>Peso ({unit})</span>
						<span>Reps</span>
						<span></span>
					</div>
					{#each entry.sets as set, i (set.id)}
						{@const prev = lastByExercise[entry.exerciseId]?.sets[i]}
						<div class="set-row">
							<span class="set-n stat-num">{i + 1}</span>
							<input
								type="number"
								inputmode="decimal"
								step="0.5"
								min="0"
								max={maxWeight}
								class="input set-input"
								placeholder={prev ? formatLoad(prev.weight, unit) : '0'}
								bind:value={set.weight}
							/>
							<input
								type="number"
								inputmode="decimal"
								step="0.5"
								min="0"
								max={MAX_REPS}
								class="input set-input"
								placeholder={prev ? fmt(prev.reps) : '0'}
								bind:value={set.reps}
							/>
							<button
								type="button"
								class="set-del"
								aria-label="Quitar serie"
								onclick={() => removeSet(entry, set.id)}
							>
								<Icon name="minus" size={15} />
							</button>
						</div>
					{/each}
				</div>

				<button
					type="button"
					class="btn btn-subtle add-set"
					disabled={entry.sets.length >= MAX_SETS_PER_ENTRY}
					onclick={() => addSet(entry)}
				>
					<Icon name="plus" size={14} stroke={2.5} /> Añadir serie
				</button>
			</div>
		{/each}
	</div>

	<!-- Add exercise -->
	{#if exercises.length > 0}
		<div class="add-ex">
			<select class="input" bind:value={pick}>
				<option value="">Añadir ejercicio…</option>
				{#each exercises as ex (ex.id)}
					<option value={ex.id}>{ex.name}</option>
				{/each}
			</select>
			<button
				type="button"
				class="btn btn-primary"
				disabled={!pick || entries.length >= MAX_SESSION_ENTRIES}
				onclick={() => addExercise(pick)}
			>
				<Icon name="plus" size={16} stroke={2.5} /> Añadir
			</button>
		</div>
	{:else if entries.length === 0 && !onCreateExercise}
		<p class="muted empty-note">
			No tienes ejercicios. Créalos en <a href={resolve('/exercises')} class="accent">Ejercicios</a
			>.
		</p>
	{/if}
	{#if onCreateExercise}
		<div class="add-ex">
			<input
				class="input"
				type="text"
				maxlength={NAME_MAX}
				placeholder="Nuevo ejercicio, p. ej. Remo con mancuerna"
				aria-label="Nombre del ejercicio nuevo"
				bind:value={newExerciseName}
				onkeydown={(event) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						void createExercise();
					}
				}}
			/>
			<button
				type="button"
				class="btn btn-subtle"
				disabled={!newExerciseName.trim() ||
					creatingExercise ||
					entries.length >= MAX_SESSION_ENTRIES}
				onclick={createExercise}
			>
				<Icon name="plus" size={16} stroke={2.5} /> Crear
			</button>
		</div>
	{/if}

	<div class="field">
		<label class="label" for="notes">Notas (opcional)</label>
		<input
			id="notes"
			name="notes"
			class="input"
			maxlength={NOTES_MAX}
			placeholder="Cómo te sentiste, alguna molestia…"
			bind:value={notes}
		/>
	</div>

	<div class="submit-row">
		{#if mode === 'edit'}
			{#if onDelete}
				<button type="button" class="btn btn-danger" onclick={() => (deletePending = true)}>
					<Icon name="trash" size={15} /> Borrar
				</button>
			{/if}
		{/if}
		<div class="spacer"></div>
		<button type="submit" class="btn btn-primary save-btn" disabled={!canSave || saving}>
			<Icon name="check" size={17} stroke={2.5} />
			{saving ? 'Guardando…' : 'Guardar sesión'}
		</button>
	</div>
</form>

<ConfirmDialog
	open={deletePending}
	title="¿Borrar sesión?"
	message="Este entrenamiento y todas sus series se borrarán para siempre. No se puede deshacer."
	confirmLabel="Borrar sesión"
	busy={deleting}
	onCancel={() => (deletePending = false)}
	onConfirm={() => void remove()}
/>

<style>
	.form-error {
		margin: 0 0 1rem;
		padding: 0.75rem 1rem;
		border-left: 3px solid var(--color-bad);
		background: color-mix(in srgb, var(--color-bad) 8%, transparent);
		color: var(--color-bad);
		font-size: 0.875rem;
	}
	.draft-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		margin-bottom: 1rem;
		border-left: 3px solid var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface));
		color: var(--color-accent-bright);
	}
	.draft-text {
		flex: 1;
		font-size: 0.85rem;
		font-weight: 600;
	}
	.draft-discard {
		flex-shrink: 0;
		min-height: 2.5rem;
		padding: 0.35rem 0.7rem;
		border-radius: var(--radius-control);
		background: transparent;
		border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
		color: var(--color-accent-bright);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
	}
	@media (hover: hover) {
		.draft-discard:hover {
			background: color-mix(in srgb, var(--color-accent) 20%, transparent);
		}
	}
	.draft-discard:active {
		transform: translateY(1px);
	}

	.top {
		display: grid;
		grid-template-columns: minmax(10rem, 0.65fr) minmax(14rem, 1fr);
		gap: 1rem;
		margin-bottom: 1.5rem;
		padding: 1rem;
		border: 1px solid var(--color-border);
		border-top: 3px solid var(--color-accent);
		border-radius: var(--radius-overlay);
		background: var(--color-surface-2);
	}
	.field {
		display: flex;
		flex-direction: column;
	}
	.load-btn {
		grid-column: 1 / -1;
		justify-content: flex-start;
		font-size: 0.85rem;
	}

	.entries {
		border-top: 1px solid var(--color-border);
	}
	.entry {
		padding: 1.25rem 0;
		border-bottom: 1px solid var(--color-border);
	}
	.entry-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.875rem;
	}
	.entry-title {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		min-width: 0;
	}
	.entry-name {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 1.3rem;
	}
	.entry-mg {
		font-size: 0.75rem;
	}

	.last-ref {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		flex-wrap: wrap;
		margin: 0 0 0.75rem;
		padding: 0.5rem 0;
		border-block: 1px solid var(--color-border-soft);
	}
	.last-ref :global(svg) {
		color: var(--color-accent);
		flex-shrink: 0;
	}
	.last-label {
		font-size: 0.68rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-muted);
	}
	.last-sets {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.55rem;
	}
	.last-set {
		font-size: 0.82rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--color-subtle);
	}
	.ls-x {
		font-weight: 500;
		color: var(--color-muted);
		margin: 0 0.05rem;
	}

	.sets {
		display: flex;
		flex-direction: column;
		gap: 0;
	}
	.set-head,
	.set-row {
		display: grid;
		grid-template-columns: 2rem minmax(7rem, 1fr) minmax(7rem, 1fr) 2.75rem;
		align-items: center;
		gap: 0.5rem;
	}
	.set-head {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 0.375rem 0;
		border-bottom: 1px solid var(--color-border-soft);
	}
	.set-row {
		min-height: 3.5rem;
		padding: 0.375rem 0;
		border-bottom: 1px solid var(--color-border-soft);
	}
	.set-row:last-child {
		border-bottom: 0;
	}
	.set-n {
		text-align: center;
		font-weight: 700;
		color: var(--color-muted);
	}
	.set-input {
		text-align: center;
		padding: 0.625rem 0.4rem;
		font-size: 1rem;
		font-variant-numeric: tabular-nums;
	}
	.set-del {
		display: grid;
		place-items: center;
		height: 2.75rem;
		border-radius: var(--radius-control);
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-muted);
		cursor: pointer;
	}
	@media (hover: hover) {
		.set-del:hover {
			color: var(--color-bad);
			border-color: color-mix(in srgb, var(--color-bad) 40%, transparent);
		}
	}
	.set-del:active {
		transform: translateY(1px);
		color: var(--color-bad);
	}
	.add-set {
		margin-top: 0.75rem;
		width: auto;
		font-size: 0.85rem;
	}

	.add-ex {
		display: flex;
		gap: 0.5rem;
		padding: 1rem 0;
		margin-top: 0.5rem;
		border-bottom: 1px solid var(--color-border);
	}
	.add-ex .input {
		flex: 1;
	}
	.empty-note {
		margin-top: 0.8rem;
		font-size: 0.9rem;
	}

	form > .field {
		margin-top: 1.5rem;
	}

	.submit-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border);
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
		width: 2.5rem;
		height: 2.5rem;
		border-radius: var(--radius-control);
		background: transparent;
		border: 1px solid transparent;
		color: var(--color-muted);
		cursor: pointer;
		flex-shrink: 0;
	}
	@media (hover: hover) {
		.icon-action:hover {
			background: var(--color-surface-2);
			color: var(--color-bad);
		}
	}
	.icon-action:active {
		transform: translateY(1px);
		color: var(--color-bad);
	}

	@media (max-width: 640px) {
		.top {
			grid-template-columns: 1fr;
		}
		.load-btn {
			grid-column: auto;
			text-align: left;
			white-space: normal;
		}
		.entry-title {
			align-items: flex-start;
			flex-direction: column;
			gap: 0;
		}
		.set-head,
		.set-row {
			grid-template-columns: 1.5rem minmax(0, 1fr) minmax(0, 1fr) 2.75rem;
			gap: 0.375rem;
		}
		.set-head {
			font-size: 0.64rem;
		}
		.add-ex {
			align-items: stretch;
			flex-direction: column;
		}
		.add-set {
			width: 100%;
		}
		.submit-row {
			flex-wrap: wrap;
		}
		.save-btn {
			flex: 1 1 11rem;
		}
	}
</style>
