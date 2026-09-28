<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import UnitToggle from '$lib/components/UnitToggle.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import MeasurementsPanel from '$lib/components/MeasurementsPanel.svelte';
	import {
		lengthUnitOf,
		newEntityId,
		offlineData,
		queueOfflineMutation,
		weightUnitOf
	} from '$lib/offline/store';
	import type { MeasurementPayload } from '$lib/limits';
	import type { Measurement } from '$lib/types';

	const user = $derived(page.data.user);
	const measurements = $derived<Measurement[]>(
		$offlineData?.measurements ?? page.data.offline?.measurements ?? []
	);
	const weightUnit = $derived(weightUnitOf($offlineData, user));
	const lengthUnit = $derived(lengthUnitOf($offlineData, user));

	async function save(payload: MeasurementPayload, id: string | null) {
		const body = { ...payload } as unknown as Record<string, unknown>;
		await queueOfflineMutation('measurement', id ? 'update' : 'create', id ?? newEntityId(), body);
	}
</script>

<svelte:head><title>Cuerpo · Gym Tracker</title></svelte:head>

<PageHeader title="Cuerpo" subtitle="Peso, medidas y fotos de progreso">
	{#snippet action()}
		<div class="header-actions">
			<UnitToggle kind="length" />
			<a href={resolve('/progress')} class="btn btn-subtle btn-sm">
				<Icon name="trending" size={15} /> Ejercicios
			</a>
		</div>
	{/snippet}
</PageHeader>

<MeasurementsPanel
	{measurements}
	{weightUnit}
	{lengthUnit}
	canEdit={(measurement) => !measurement.loggedBy}
	authorLabel={(measurement) => (measurement.loggedBy ? 'Anotado por tu entrenador' : null)}
	onSave={save}
	onDelete={(id) => queueOfflineMutation('measurement', 'delete', id)}
/>

<style>
	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.btn-sm {
		min-height: 2.25rem;
		padding: 0.4rem 0.7rem;
		font-size: 0.8rem;
	}
</style>
