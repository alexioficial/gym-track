<script lang="ts">
	import Icon from './Icon.svelte';
	import Sparkline from './Sparkline.svelte';
	import EmptyState from './EmptyState.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import MeasurementForm from './MeasurementForm.svelte';
	import { photoUrl } from '$lib/client/photos';
	import {
		knownMeasurementNames,
		measurementSeries,
		seriesChange,
		type MeasurementSeries
	} from '$lib/measurements';
	import type { MeasurementPayload } from '$lib/limits';
	import { formatDate } from '$lib/utils/progression';
	import { displayLength, displayStat, type LengthUnit, type WeightUnit } from '$lib/units';
	import type { Measurement } from '$lib/types';

	interface Props {
		measurements: Measurement[];
		weightUnit: WeightUnit;
		lengthUnit: LengthUnit;
		/** Whether the viewer may change this record. */
		canEdit: (measurement: Measurement) => boolean;
		/** Label for records someone else wrote, e.g. «Anotado por tu entrenador». */
		authorLabel?: (measurement: Measurement) => string | null;
		photoUserId?: string;
		onSave: (payload: MeasurementPayload, id: string | null) => Promise<void>;
		onDelete: (id: string) => Promise<void>;
	}

	let {
		measurements,
		weightUnit,
		lengthUnit,
		canEdit,
		authorLabel = () => null,
		photoUserId,
		onSave,
		onDelete
	}: Props = $props();

	let editing = $state<Measurement | 'new' | null>(null);
	let pendingDelete = $state<Measurement | null>(null);
	let deleting = $state(false);
	let viewing = $state<string | null>(null);

	const series = $derived(measurementSeries(measurements));
	const knownNames = $derived(knownMeasurementNames(measurements));

	function unitOf(item: MeasurementSeries): string {
		if (item.kind === 'weight') return weightUnit;
		if (item.kind === 'percent') return '%';
		return lengthUnit;
	}

	function show(item: MeasurementSeries, value: number): number {
		if (item.kind === 'weight') return displayStat(value, weightUnit);
		if (item.kind === 'percent') return Math.round(value * 10) / 10;
		return displayLength(value, lengthUnit);
	}

	function signed(value: number): string {
		return `${value > 0 ? '+' : ''}${value}`;
	}

	async function save(payload: MeasurementPayload) {
		const target = editing;
		await onSave(payload, target && target !== 'new' ? target.id : null);
		editing = null;
	}

	async function confirmDelete() {
		if (!pendingDelete || deleting) return;
		deleting = true;
		try {
			await onDelete(pendingDelete.id);
		} finally {
			deleting = false;
			pendingDelete = null;
		}
	}
</script>

{#if editing}
	<section class="form-panel">
		<h2 class="section-label">{editing === 'new' ? 'Nuevo registro' : 'Editar registro'}</h2>
		{#key editing}
			<MeasurementForm
				initial={editing === 'new' ? null : editing}
				{weightUnit}
				{lengthUnit}
				{knownNames}
				{photoUserId}
				onSave={save}
				onCancel={() => (editing = null)}
			/>
		{/key}
	</section>
{:else}
	<button type="button" class="btn btn-primary new" onclick={() => (editing = 'new')}>
		<Icon name="plus" size={16} /> Nuevo registro
	</button>
{/if}

{#if series.length}
	<section class="block">
		<h2 class="section-label">Evolución</h2>
		<div class="ledger-section">
			{#each series as item (item.key)}
				{@const change = seriesChange(item)}
				<div class="ledger-row serie">
					<div class="serie-name">
						<strong>{item.label}</strong>
						<span class="muted small">{formatDate(change.latest.date)}</span>
					</div>
					{#if item.points.length > 1}
						<Sparkline values={item.points.map((point) => point.value)} />
					{/if}
					<div class="serie-value">
						<span class="data-value big">{show(item, change.latest.value)}</span>
						<span class="muted small">{unitOf(item)}</span>
						{#if change.sincePrevious !== null}
							<span class="muted small delta">
								{signed(show(item, change.sincePrevious))} desde el anterior
								{#if item.points.length > 2}· {signed(show(item, change.sinceFirst ?? 0))} en total{/if}
							</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</section>
{/if}

<section class="block">
	<h2 class="section-label">Historial</h2>
	{#if measurements.length === 0}
		<EmptyState
			icon="activity"
			title="Aún no hay registros"
			message="Anota el peso, las medidas que quieras o fotos, y aquí verás cómo cambian."
		/>
	{:else}
		<div class="ledger-section">
			{#each measurements as measurement (measurement.id)}
				{@const author = authorLabel(measurement)}
				<article class="record">
					<header>
						<strong>{formatDate(measurement.date)}</strong>
						{#if author}<span class="badge badge-accent">{author}</span>{/if}
						{#if canEdit(measurement)}
							<span class="record-actions">
								<button
									type="button"
									class="btn btn-ghost icon"
									aria-label="Editar registro"
									onclick={() => (editing = measurement)}
								>
									<Icon name="pencil" size={15} />
								</button>
								<button
									type="button"
									class="btn btn-ghost icon danger"
									aria-label="Borrar registro"
									onclick={() => (pendingDelete = measurement)}
								>
									<Icon name="trash" size={15} />
								</button>
							</span>
						{/if}
					</header>
					<ul class="values">
						{#if measurement.bodyWeight != null}
							<li>
								Peso <span class="data-value"
									>{displayStat(measurement.bodyWeight, weightUnit)} {weightUnit}</span
								>
							</li>
						{/if}
						{#if measurement.bodyFat != null}
							<li>Grasa <span class="data-value">{measurement.bodyFat} %</span></li>
						{/if}
						{#if measurement.height != null}
							<li>
								Altura <span class="data-value"
									>{displayLength(measurement.height, lengthUnit)} {lengthUnit}</span
								>
							</li>
						{/if}
						{#each measurement.items as item, index (index)}
							<li>
								{item.name}
								<span class="data-value">{displayLength(item.value, lengthUnit)} {lengthUnit}</span>
							</li>
						{/each}
					</ul>
					{#if measurement.photos.length}
						<div class="thumbs">
							{#each measurement.photos as key (key)}
								<button
									type="button"
									class="thumb"
									aria-label="Ver foto"
									onclick={() => (viewing = key)}
								>
									<img src={photoUrl(key)} alt="Foto de progreso" loading="lazy" />
								</button>
							{/each}
						</div>
					{/if}
				</article>
			{/each}
		</div>
	{/if}
</section>

{#if viewing}
	<button type="button" class="viewer" aria-label="Cerrar foto" onclick={() => (viewing = null)}>
		<img src={photoUrl(viewing)} alt="Foto de progreso" />
	</button>
{/if}

<ConfirmDialog
	open={pendingDelete !== null}
	title="¿Borrar registro?"
	message={pendingDelete
		? `Se borrará el registro del ${formatDate(pendingDelete.date)}, con sus fotos.`
		: ''}
	confirmLabel="Borrar"
	busy={deleting}
	onCancel={() => (pendingDelete = null)}
	onConfirm={() => void confirmDelete()}
/>

<style>
	.new {
		margin-bottom: 1.75rem;
	}
	.form-panel {
		margin-bottom: 2rem;
		padding: 1.25rem 0;
		border-top: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
	}
	.form-panel > .section-label {
		margin-bottom: 1rem;
	}
	.block {
		margin-bottom: 2rem;
	}
	.block > .section-label {
		margin-bottom: 0.6rem;
	}
	.ledger-section {
		background: none;
	}
	.serie {
		justify-content: space-between;
	}
	.serie-name {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}
	.serie-value {
		display: grid;
		grid-template-columns: auto auto;
		align-items: baseline;
		justify-items: end;
		column-gap: 0.3rem;
		min-width: 6rem;
	}
	.big {
		font-size: 1.15rem;
		font-weight: 700;
	}
	.small {
		font-size: 0.75rem;
	}
	.delta {
		grid-column: 1 / -1;
	}
	.record {
		padding: 0.85rem 0;
		border-bottom: 1px solid var(--color-border-soft);
	}
	.record:last-child {
		border-bottom: 0;
	}
	.record header {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.record-actions {
		display: flex;
		margin-left: auto;
	}
	.icon {
		width: 2.4rem;
		min-height: 2.4rem;
		padding: 0;
	}
	.danger {
		color: var(--color-bad);
	}
	.values {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 1.1rem;
		margin: 0.5rem 0 0;
		padding: 0;
		list-style: none;
		color: var(--color-subtle);
		font-size: 0.88rem;
	}
	.values .data-value {
		color: var(--color-text);
	}
	.thumbs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}
	.thumb {
		width: 4.5rem;
		height: 6rem;
		padding: 0;
		overflow: hidden;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-control);
		background: var(--color-surface-2);
		cursor: zoom-in;
	}
	.thumb img,
	.viewer img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.viewer {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: grid;
		place-items: center;
		padding: 1rem;
		border: 0;
		background: color-mix(in srgb, #000 88%, transparent);
		cursor: zoom-out;
	}
	.viewer img {
		width: auto;
		height: auto;
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
	}
</style>
