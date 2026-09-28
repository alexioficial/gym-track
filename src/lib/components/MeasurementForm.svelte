<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import Icon from './Icon.svelte';
	import { photoUrl, uploadPhoto } from '$lib/client/photos';
	import { ClientApiError } from '$lib/client/json';
	import {
		MAX_BODY_WEIGHT,
		MAX_LENGTH_CM,
		MEASUREMENT_ITEMS_MAX,
		MEASUREMENT_NAME_MAX,
		MEASUREMENT_PHOTOS_MAX,
		measurementProblem,
		type MeasurementPayload
	} from '$lib/limits';
	import { todayYmd } from '$lib/utils/progression';
	import {
		LB_PER_KG,
		displayLength,
		displayStat,
		toStoredCm,
		toStoredLb,
		type LengthUnit,
		type WeightUnit
	} from '$lib/units';
	import type { Measurement } from '$lib/types';

	interface Props {
		initial?: Measurement | null;
		weightUnit: WeightUnit;
		lengthUnit: LengthUnit;
		knownNames: string[];
		/** A coach uploading for a client passes the client's id. */
		photoUserId?: string;
		onSave: (payload: MeasurementPayload) => Promise<void>;
		onCancel: () => void;
	}

	let {
		initial = null,
		weightUnit,
		lengthUnit,
		knownNames,
		photoUserId,
		onSave,
		onCancel
	}: Props = $props();

	/**
	 * A number shown from a stored value. While the input still holds what it
	 * first showed, the stored value is kept, so reopening and saving never
	 * rounds 80.55 cm to 80.6 cm.
	 */
	interface Field {
		value: number | null;
		shown: number | null;
		stored: number | null;
	}
	interface ItemField extends Field {
		key: number;
		name: string;
	}

	const field = (stored: number | null | undefined, show: (value: number) => number): Field => {
		if (stored == null) return { value: null, shown: null, stored: null };
		const shown = show(stored);
		return { value: shown, shown, stored };
	};
	const kept = (item: Field, convert: (value: number) => number): number | null => {
		if (item.value === null || String(item.value) === '') return null;
		if (item.stored !== null && item.value === item.shown) return item.stored;
		return convert(Number(item.value));
	};

	// The form is created fresh for each record, so reading the props once is intended.
	const start = untrack(() => initial);
	let date = $state(start?.date ?? todayYmd());
	let bodyWeight = $state(field(start?.bodyWeight, (lb) => displayStat(lb, weightUnit)));
	let bodyFat = $state(field(start?.bodyFat, (value) => value));
	let height = $state(field(start?.height, (cm) => displayLength(cm, lengthUnit)));
	let nextKey = 0;
	let items = $state<ItemField[]>(
		(start?.items ?? []).map((item) => ({
			key: nextKey++,
			name: item.name,
			...field(item.value, (cm) => displayLength(cm, lengthUnit))
		}))
	);
	let photos = $state<string[]>([...(start?.photos ?? [])]);

	let saving = $state(false);
	let uploading = $state(0);
	let problem = $state<string | null>(null);
	let online = $state(true);

	onMount(() => {
		const update = () => (online = navigator.onLine);
		update();
		window.addEventListener('online', update);
		window.addEventListener('offline', update);
		return () => {
			window.removeEventListener('online', update);
			window.removeEventListener('offline', update);
		};
	});

	const unusedNames = $derived(
		knownNames.filter(
			(name) => !items.some((item) => item.name.trim().toLowerCase() === name.toLowerCase())
		)
	);
	const maxWeightShown = $derived(
		weightUnit === 'lb' ? MAX_BODY_WEIGHT : Math.floor(MAX_BODY_WEIGHT / LB_PER_KG)
	);
	const maxLengthShown = $derived(
		lengthUnit === 'cm' ? MAX_LENGTH_CM : Math.floor(displayLength(MAX_LENGTH_CM, 'in'))
	);

	function addItem(name = '') {
		if (items.length >= MEASUREMENT_ITEMS_MAX) return;
		items.push({ key: nextKey++, name, value: null, shown: null, stored: null });
	}

	async function addPhotos(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const files = [...(input.files ?? [])].slice(0, MEASUREMENT_PHOTOS_MAX - photos.length);
		input.value = '';
		problem = null;
		for (const file of files) {
			uploading += 1;
			try {
				photos.push(await uploadPhoto(file, photoUserId));
			} catch (error) {
				problem = error instanceof ClientApiError ? error.message : 'No se pudo subir la foto';
			} finally {
				uploading -= 1;
			}
		}
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (saving || uploading) return;
		const payload: MeasurementPayload = {
			date,
			bodyWeight: kept(bodyWeight, (value) => toStoredLb(value, weightUnit)),
			bodyFat: kept(bodyFat, (value) => Math.round(value * 10) / 10),
			height: kept(height, (value) => toStoredCm(value, lengthUnit)),
			items: items
				.filter((item) => item.name.trim() || item.value !== null)
				.map((item) => ({
					name: item.name.trim(),
					value: kept(item, (value) => toStoredCm(value, lengthUnit)) ?? 0
				})),
			photos
		};
		problem = measurementProblem(payload);
		if (problem) return;
		saving = true;
		try {
			await onSave(payload);
		} catch (error) {
			problem = error instanceof Error ? error.message : 'No se pudo guardar';
		} finally {
			saving = false;
		}
	}
</script>

<form class="measure-form" onsubmit={submit}>
	<div class="field-grid">
		<div>
			<label class="label" for="m-date">Fecha</label>
			<input id="m-date" type="date" class="input" bind:value={date} required />
		</div>
		<div>
			<label class="label" for="m-weight">Peso corporal ({weightUnit})</label>
			<input
				id="m-weight"
				type="number"
				class="input"
				inputmode="decimal"
				min="0"
				max={maxWeightShown}
				step="0.1"
				bind:value={bodyWeight.value}
			/>
		</div>
		<div>
			<label class="label" for="m-fat">Grasa corporal (%)</label>
			<input
				id="m-fat"
				type="number"
				class="input"
				inputmode="decimal"
				min="0"
				max="100"
				step="0.1"
				bind:value={bodyFat.value}
			/>
		</div>
		<div>
			<label class="label" for="m-height">Altura ({lengthUnit})</label>
			<input
				id="m-height"
				type="number"
				class="input"
				inputmode="decimal"
				min="0"
				max={maxLengthShown}
				step="0.1"
				bind:value={height.value}
			/>
		</div>
	</div>

	<fieldset class="items">
		<legend class="section-label">Medidas ({lengthUnit})</legend>
		{#each items as item, index (item.key)}
			<div class="item-row">
				<input
					class="input"
					type="text"
					placeholder="Nombre, p. ej. Cintura"
					aria-label="Nombre de la medida"
					maxlength={MEASUREMENT_NAME_MAX}
					list="measurement-names"
					bind:value={item.name}
				/>
				<input
					class="input value"
					type="number"
					inputmode="decimal"
					min="0"
					max={maxLengthShown}
					step="0.1"
					aria-label="Valor en {lengthUnit}"
					bind:value={item.value}
				/>
				<button
					type="button"
					class="btn btn-ghost icon"
					aria-label="Quitar medida"
					onclick={() => items.splice(index, 1)}
				>
					<Icon name="x" size={16} />
				</button>
			</div>
		{/each}
		<datalist id="measurement-names">
			{#each unusedNames as name (name)}<option value={name}></option>{/each}
		</datalist>
		{#if unusedNames.length && items.length === 0}
			<p class="muted hint">Las de la última vez:</p>
			<div class="quick">
				{#each unusedNames.slice(0, 8) as name (name)}
					<button type="button" class="btn btn-subtle btn-sm" onclick={() => addItem(name)}>
						<Icon name="plus" size={13} />
						{name}
					</button>
				{/each}
			</div>
		{/if}
		<button
			type="button"
			class="btn btn-subtle btn-sm"
			disabled={items.length >= MEASUREMENT_ITEMS_MAX}
			onclick={() => addItem()}
		>
			<Icon name="plus" size={14} /> Añadir medida
		</button>
	</fieldset>

	<fieldset class="photos">
		<legend class="section-label">Fotos</legend>
		{#if photos.length}
			<div class="thumbs">
				{#each photos as key (key)}
					<div class="thumb">
						<img src={photoUrl(key)} alt="Foto de progreso" loading="lazy" />
						<button
							type="button"
							class="remove"
							aria-label="Quitar foto"
							onclick={() => (photos = photos.filter((item) => item !== key))}
						>
							<Icon name="x" size={14} />
						</button>
					</div>
				{/each}
			</div>
		{/if}
		{#if !online}
			<p class="muted hint">Las fotos necesitan conexión; el resto se guarda sin internet.</p>
		{:else if photos.length < MEASUREMENT_PHOTOS_MAX}
			<label class="btn btn-subtle btn-sm upload" class:busy={uploading > 0}>
				<Icon name="plus" size={14} />
				{uploading ? 'Subiendo…' : 'Añadir fotos'}
				<input
					type="file"
					accept="image/*"
					multiple
					disabled={uploading > 0}
					onchange={addPhotos}
				/>
			</label>
		{/if}
	</fieldset>

	{#if problem}<p class="problem" role="alert">{problem}</p>{/if}

	<div class="actions">
		<button type="submit" class="btn btn-primary" disabled={saving || uploading > 0}>
			<Icon name="check" size={16} />
			{saving ? 'Guardando…' : 'Guardar'}
		</button>
		<button type="button" class="btn btn-ghost" onclick={onCancel}>Cancelar</button>
	</div>
</form>

<style>
	.measure-form {
		display: grid;
		gap: 1.25rem;
	}
	fieldset {
		display: grid;
		gap: 0.6rem;
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		margin-bottom: 0.6rem;
	}
	.item-row {
		display: grid;
		grid-template-columns: 1fr 6.5rem auto;
		gap: 0.5rem;
	}
	.icon {
		width: 2.75rem;
		padding: 0;
	}
	.btn-sm {
		justify-self: start;
		min-height: 2.2rem;
		padding: 0.4rem 0.7rem;
		font-size: 0.8rem;
	}
	.quick {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.hint {
		font-size: 0.8rem;
	}
	.thumbs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.thumb {
		position: relative;
		width: 5.5rem;
		height: 7rem;
		overflow: hidden;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-control);
		background: var(--color-surface-2);
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.remove {
		position: absolute;
		top: 0.25rem;
		right: 0.25rem;
		display: grid;
		place-items: center;
		width: 1.6rem;
		height: 1.6rem;
		border: 0;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-bg) 80%, transparent);
		color: var(--color-text);
		cursor: pointer;
	}
	.upload {
		position: relative;
		cursor: pointer;
	}
	.upload input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}
	.upload.busy {
		opacity: 0.6;
	}
	.problem {
		color: var(--color-bad);
		font-size: 0.88rem;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
	}
</style>
