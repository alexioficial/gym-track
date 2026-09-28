<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import ProgressOverview from '$lib/components/ProgressOverview.svelte';
	import { offlineData, weightUnitOf } from '$lib/offline/store';
	import {
		buildExerciseProgress,
		buildWeeklyRecap,
		groupProgressByRoutine
	} from '$lib/utils/progression';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const unit = $derived(weightUnitOf($offlineData, data.user));
	const view = $derived.by(() => {
		if (!$offlineData) return data;
		const progress = buildExerciseProgress($offlineData.sessions, $offlineData.exercises);
		return {
			groups: groupProgressByRoutine(progress, $offlineData.routines),
			recap: buildWeeklyRecap(progress),
			untracked: progress.filter((item) => item.weeks.length === 0).map((item) => item.exercise)
		};
	});
</script>

<svelte:head><title>Progreso - Gym Tracker</title></svelte:head>

<PageHeader title="Progreso" subtitle="Tu sobrecarga progresiva, semana a semana">
	{#snippet action()}
		<a href={resolve('/measurements')} class="btn btn-subtle">
			<Icon name="activity" size={16} /> Cuerpo
		</a>
	{/snippet}
</PageHeader>

<ProgressOverview
	groups={view.groups}
	recap={view.recap}
	untracked={view.untracked}
	{unit}
	exerciseHref={(exerciseId) => resolve('/progress/[exerciseId]', { exerciseId })}
>
	<a href={resolve('/log')} class="btn btn-primary"
		><Icon name="plus" size={16} stroke={2.5} /> Registrar sesión</a
	>
</ProgressOverview>
