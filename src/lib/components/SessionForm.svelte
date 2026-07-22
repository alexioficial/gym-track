<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import Icon from './Icon.svelte';
	import { UNIT, type Exercise, type LastPerformance, type Routine, type Session } from '$lib/types';
	import { shortLabel, todayYmd } from '$lib/utils/progression';

	interface Props {
		exercises: Exercise[];
		routines: Routine[];
		mode: 'create' | 'edit';
		session?: Session | null;
		initialRoutineId?: string;
		/** Reference: what the user did the last time they logged each exercise. */
		lastByExercise?: Record<string, LastPerformance>;
	}
	let {
		exercises,
		routines,
		mode,
		session = null,
		initialRoutineId = '',
		lastByExercise = {}
	}: Props = $props();

	/** Trim a value for display: "135", "5.5" — no trailing ".0". */
	const fmt = (n: number) => String(Math.round(n * 100) / 100);

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
		// When creating with a preselected routine, preload its exercises + planned sets.
		const routine = routines.find((r) => r.id === initialRoutineId);
		if (routine) {
			return routine.exercises
				.filter((re) => exercises.some((e) => e.id === re.exerciseId))
				.map(routineEntry);
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
	// Exercises assigned to the selected routine that aren't in the session yet.
	const missingFromRoutine = $derived(
		selectedRoutine
			? selectedRoutine.exercises.filter(
					(re) => exercises.some((e) => e.id === re.exerciseId) && !usedIds.has(re.exerciseId)
				)
			: []
	);
	// Any set with a value typed in — used to decide whether it's safe to replace entries.
	const hasData = $derived(entries.some((e) => e.sets.some((s) => s.weight != null || s.reps != null)));

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

	// ---- Draft autosave (create mode only) ----
	// The gym is used on a phone: if the screen is left mid-log (navigate away,
	// app backgrounded, tab reloaded) the in-memory state would be lost. We mirror
	// the working session to localStorage as it changes and restore it on return.
	const DRAFT_KEY = 'gym:log-draft';
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
				const restored: EditEntry[] = Array.isArray(d?.entries)
					? d.entries
							.filter((e: EditEntry) => e && exercises.some((x) => x.id === e.exerciseId))
							.map((e: EditEntry) => ({
								exerciseId: String(e.exerciseId),
								sets: (Array.isArray(e.sets) ? e.sets : []).map((s: EditSet) => ({
									id: nextId(),
									weight: s?.weight ?? null,
									reps: s?.reps ?? null
								}))
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
		const snapshot = JSON.stringify({ savedAt: Date.now(), date, routineId, notes, entries });
		const meaningful = hasData;
		if (!loaded) return; // don't write (or clobber) until the initial draft load ran
		if (meaningful) localStorage.setItem(DRAFT_KEY, snapshot);
		else localStorage.removeItem(DRAFT_KEY);
	});

	function addExercise(id: string) {
		if (!id || usedIds.has(id)) return;
		entries.push({ exerciseId: id, sets: [{ id: nextId(), weight: null, reps: null }] });
		pick = '';
	}

	// Build an entry with the routine's planned number of (empty) set rows.
	function routineEntry(re: { exerciseId: string; sets: number }): EditEntry {
		const n = Math.max(1, re.sets);
		return {
			exerciseId: re.exerciseId,
			sets: Array.from({ length: n }, () => ({ id: nextId(), weight: null, reps: null }))
		};
	}

	// Add the routine's exercises that aren't already in the session.
	function loadRoutine() {
		if (!selectedRoutine) return;
		const used = new Set(entries.map((e) => e.exerciseId));
		for (const re of selectedRoutine.exercises) {
			if (exercises.some((e) => e.id === re.exerciseId) && !used.has(re.exerciseId)) {
				entries.push(routineEntry(re));
				used.add(re.exerciseId);
			}
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

<form
	method="POST"
	action={mode === 'create' ? '?/create' : '?/update'}
	use:enhance={() => {
		return async ({ result, update }) => {
			// A successful create/update leaves the page (redirect) — drop the draft.
			if (result.type === 'redirect' || result.type === 'success') clearDraft();
			await update();
		};
	}}
>
	{#if mode === 'edit' && session}
		<input type="hidden" name="id" value={session.id} />
	{/if}
	<input type="hidden" name="entries" value={JSON.stringify(payload)} />

	{#if draftRecovered}
		<div class="draft-banner">
			<Icon name="clipboard" size={16} />
			<span class="draft-text">Recovered your unsaved session.</span>
			<button type="button" class="draft-discard" onclick={discardDraft}>Discard</button>
		</div>
	{/if}

	<div class="top card">
		<div class="field">
			<label class="label" for="date">Date</label>
			<input id="date" name="date" type="date" class="input" bind:value={date} required />
		</div>
		<div class="field">
			<label class="label" for="routine">Routine</label>
			<select
				id="routine"
				name="routineId"
				class="input"
				bind:value={routineId}
				onchange={onRoutineChange}
			>
				<option value="">Free session</option>
				{#each routines as r (r.id)}
					<option value={r.id}>{r.name}</option>
				{/each}
			</select>
		</div>
		{#if selectedRoutine && missingFromRoutine.length > 0}
			<button type="button" class="btn btn-ghost load-btn" onclick={loadRoutine}>
				<Icon name="plus" size={15} stroke={2.5} />
				Add {missingFromRoutine.length}
				{missingFromRoutine.length === 1 ? 'exercise' : 'exercises'} from {selectedRoutine.name}
			</button>
		{/if}
	</div>

	<!-- Exercises -->
	<div class="entries">
		{#each entries as entry (entry.exerciseId)}
			<div class="entry card">
				<div class="entry-head">
					<div class="entry-title">
						<span class="entry-name">{exerciseName.get(entry.exerciseId) ?? 'Exercise'}</span>
						{#if exerciseMg.get(entry.exerciseId)}
							<span class="muted entry-mg">{exerciseMg.get(entry.exerciseId)}</span>
						{/if}
					</div>
					<button
						type="button"
						class="icon-action"
						aria-label="Remove exercise"
						onclick={() => removeEntry(entry.exerciseId)}
					>
						<Icon name="x" size={16} />
					</button>
				</div>

				{#if lastByExercise[entry.exerciseId]}
					{@const last = lastByExercise[entry.exerciseId]}
					<div class="last-ref" title="Beat this to make progress">
						<Icon name="history" size={13} />
						<span class="last-label">Last · {shortLabel(last.date)}</span>
						<span class="last-sets">
							{#each last.sets as s, i (i)}
								<span class="last-set">{fmt(s.weight)}<span class="ls-x">×</span>{fmt(s.reps)}</span>
							{/each}
						</span>
					</div>
				{/if}

				<div class="sets">
					<div class="set-head muted">
						<span>#</span>
						<span>Weight ({UNIT})</span>
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
								class="input set-input"
								placeholder={prev ? fmt(prev.weight) : '0'}
								bind:value={set.weight}
							/>
							<input
								type="number"
								inputmode="decimal"
								step="0.5"
								min="0"
								class="input set-input"
								placeholder={prev ? fmt(prev.reps) : '0'}
								bind:value={set.reps}
							/>
							<button
								type="button"
								class="set-del"
								aria-label="Remove set"
								onclick={() => removeSet(entry, set.id)}
							>
								<Icon name="minus" size={15} />
							</button>
						</div>
					{/each}
				</div>

				<button type="button" class="btn btn-subtle add-set" onclick={() => addSet(entry)}>
					<Icon name="plus" size={14} stroke={2.5} /> Add set
				</button>
			</div>
		{/each}
	</div>

	<!-- Add exercise -->
	{#if available.length > 0}
		<div class="add-ex card">
			<select class="input" bind:value={pick}>
				<option value="">Add exercise…</option>
				{#each available as ex (ex.id)}
					<option value={ex.id}>{ex.name}</option>
				{/each}
			</select>
			<button type="button" class="btn btn-primary" disabled={!pick} onclick={() => addExercise(pick)}>
				<Icon name="plus" size={16} stroke={2.5} /> Add
			</button>
		</div>
	{:else if entries.length === 0}
		<p class="muted empty-note">
			You have no exercises. Create them in <a href="/exercises" class="accent">Exercises</a>.
		</p>
	{/if}

	<div class="field">
		<label class="label" for="notes">Notes (optional)</label>
		<input id="notes" name="notes" class="input" placeholder="How you felt, any pain…" bind:value={notes} />
	</div>

	<div class="submit-row">
		{#if mode === 'edit'}
			<button
				type="submit"
				formaction="?/delete"
				formnovalidate
				class="btn btn-danger"
				onclick={(e) => {
					if (!confirm('Delete this session?')) e.preventDefault();
				}}
			>
				<Icon name="trash" size={15} /> Delete
			</button>
		{/if}
		<div class="spacer"></div>
		<button type="submit" class="btn btn-primary save-btn" disabled={!canSave}>
			<Icon name="check" size={17} stroke={2.5} /> Save session
		</button>
	</div>
</form>

<style>
	.draft-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.7rem 0.85rem;
		margin-bottom: 1rem;
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface));
		border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
		color: var(--color-accent-bright);
	}
	.draft-text {
		flex: 1;
		font-size: 0.85rem;
		font-weight: 600;
	}
	.draft-discard {
		flex-shrink: 0;
		padding: 0.35rem 0.7rem;
		border-radius: 0.5rem;
		background: transparent;
		border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
		color: var(--color-accent-bright);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background 0.15s ease,
			transform 0.1s ease;
	}
	@media (hover: hover) {
		.draft-discard:hover {
			background: color-mix(in srgb, var(--color-accent) 20%, transparent);
		}
	}
	.draft-discard:active {
		transform: scale(0.94);
	}

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

	.last-ref {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		flex-wrap: wrap;
		margin: -0.15rem 0 0.75rem;
		padding: 0.4rem 0.6rem;
		border-radius: 0.6rem;
		background: color-mix(in srgb, var(--color-accent) 7%, var(--color-surface-2));
		border: 1px solid color-mix(in srgb, var(--color-accent) 14%, transparent);
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
		gap: 0.4rem;
	}
	.set-head,
	.set-row {
		display: grid;
		grid-template-columns: 1.6rem 1fr 1fr 2.75rem;
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
		padding: 0.7rem 0.4rem;
		font-size: 1rem;
		font-variant-numeric: tabular-nums;
	}
	.set-del {
		display: grid;
		place-items: center;
		height: 2.75rem;
		border-radius: 0.55rem;
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-muted);
		cursor: pointer;
		transition:
			color 0.15s ease,
			border-color 0.15s ease,
			transform 0.1s ease;
	}
	@media (hover: hover) {
		.set-del:hover {
			color: var(--color-bad);
			border-color: color-mix(in srgb, var(--color-bad) 40%, transparent);
		}
	}
	.set-del:active {
		transform: scale(0.9);
		color: var(--color-bad);
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
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 0.55rem;
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		color: var(--color-muted);
		cursor: pointer;
		flex-shrink: 0;
		transition:
			color 0.15s ease,
			border-color 0.15s ease,
			transform 0.1s ease;
	}
	@media (hover: hover) {
		.icon-action:hover {
			color: var(--color-bad);
			border-color: color-mix(in srgb, var(--color-bad) 40%, transparent);
		}
	}
	.icon-action:active {
		transform: scale(0.9);
		color: var(--color-bad);
	}
</style>
