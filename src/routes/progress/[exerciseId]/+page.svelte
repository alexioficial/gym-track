<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { resolve } from '$app/paths';
	import ExerciseProgressView from '$lib/components/ExerciseProgressView.svelte';
	import { offlineData, weightUnitOf } from '$lib/offline/store';
	import { weeklyStatsForExercise } from '$lib/utils/progression';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const unit = $derived(weightUnitOf($offlineData, data.user));

	const view = $derived.by(() => {
		if (!$offlineData) return data;
		const exercise =
			$offlineData.exercises.find((item) => item.id === data.exercise.id) ?? data.exercise;
		return { exercise, weeks: weeklyStatsForExercise($offlineData.sessions, exercise.id) };
	});
</script>

<svelte:head><title>{view.exercise.name} - Progreso</title></svelte:head>

<a href={resolve('/progress')} class="back"><Icon name="back" size={16} /> Progreso</a>

<ExerciseProgressView exercise={view.exercise} weeks={view.weeks} {unit} />

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-muted);
		text-decoration: none;
		margin-bottom: 1rem;
	}
	.back:hover {
		color: var(--color-accent-bright);
	}
</style>
