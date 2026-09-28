<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import ExerciseProgressView from '$lib/components/ExerciseProgressView.svelte';
	import { coachData } from '$lib/offline/coach-store';
	import { offlineData, weightUnitOf } from '$lib/offline/store';
	import { weeklyStatsForExercise } from '$lib/utils/progression';

	const entry = $derived(
		$coachData?.clients.find((item) => item.client.id === page.params.id) ?? null
	);
	const exercise = $derived(
		entry?.snapshot.exercises.find((item) => item.id === page.params.exerciseId) ?? null
	);
	const weeks = $derived(
		entry && exercise ? weeklyStatsForExercise(entry.snapshot.sessions, exercise.id) : []
	);
	const unit = $derived(weightUnitOf($offlineData, page.data.user));
</script>

<svelte:head
	><title>{exercise?.name ?? 'Ejercicio'} · {entry?.client.username ?? ''}</title></svelte:head
>

<a href={resolve('/coach/clients/[id]', { id: page.params.id! })} class="back"
	><Icon name="back" size={16} /> {entry?.client.username ?? 'Cliente'}</a
>

{#if exercise}
	<ExerciseProgressView {exercise} {weeks} {unit} own={false} />
{:else}
	<p class="muted">Este ejercicio ya no está en el catálogo del cliente.</p>
{/if}

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		margin-bottom: 1rem;
		color: var(--color-muted);
		font-size: 0.85rem;
		text-decoration: none;
	}
</style>
