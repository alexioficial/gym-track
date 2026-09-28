<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import ExerciseProgressView from '$lib/components/ExerciseProgressView.svelte';
	import { offlineData, weightUnitOf } from '$lib/offline/store';
	import { weeklyStatsForExercise } from '$lib/utils/progression';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const client = $derived(data.detail.client);
	const snapshot = $derived(data.detail.snapshot);
	const unit = $derived(weightUnitOf($offlineData, page.data.user));
	const exercise = $derived(data.exercise);
	const weeks = $derived(weeklyStatsForExercise(snapshot.sessions, exercise.id));
</script>

<svelte:head><title>{exercise.name} · {client.username}</title></svelte:head>

<a href={resolve('/coach/clients/[id]', { id: client.id })} class="back"
	><Icon name="back" size={16} /> {client.username}</a
>

<ExerciseProgressView {exercise} {weeks} {unit} own={false} />

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
