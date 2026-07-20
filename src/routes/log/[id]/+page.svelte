<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import SessionForm from '$lib/components/SessionForm.svelte';
	import { formatDate } from '$lib/utils/progression';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Editar sesión · Gym Tracker</title></svelte:head>

<a href="/log" class="back">
	<Icon name="back" size={16} /> Volver
</a>

<header class="head">
	<h1 class="head-title">Editar sesión</h1>
	<p class="muted head-sub">{formatDate(data.session.date)}</p>
</header>

<SessionForm
	mode="edit"
	session={data.session}
	exercises={data.exercises}
	routines={data.routines}
/>

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
	.head {
		margin-bottom: 1.25rem;
	}
	.head-title {
		font-size: 1.6rem;
		font-weight: 800;
	}
	.head-sub {
		font-size: 0.9rem;
		margin-top: 0.2rem;
		text-transform: capitalize;
	}
</style>
