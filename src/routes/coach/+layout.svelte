<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import {
		coachData,
		coachRejectedChanges,
		coachSyncStatus,
		dismissCoachRejectedChanges,
		initializeCoach,
		synchronizeCoach
	} from '$lib/offline/coach-store';

	let { children }: { children: import('svelte').Snippet } = $props();

	const names = $derived(
		new Map(($coachData?.clients ?? []).map((entry) => [entry.client.id, entry.client.username]))
	);
	const nouns: Record<string, string> = {
		session: 'Sesión',
		measurement: 'Registro de medidas',
		exercise: 'Ejercicio'
	};

	onMount(() => {
		const user = page.data.user;
		if (user) void initializeCoach(user.id);
	});
</script>

{#if $coachSyncStatus.pending > 0 || $coachSyncStatus.phase === 'error'}
	<button type="button" class="sync" onclick={() => void synchronizeCoach()}>
		<Icon name="history" size={15} />
		{#if $coachSyncStatus.phase === 'syncing'}
			Enviando cambios de tus clientes…
		{:else if $coachSyncStatus.phase === 'error' && $coachSyncStatus.message}
			{$coachSyncStatus.message}
		{:else}
			{$coachSyncStatus.pending === 1
				? '1 cambio de tus clientes sin enviar'
				: `${$coachSyncStatus.pending} cambios de tus clientes sin enviar`}
			{#if $coachSyncStatus.phase === 'offline'}· se enviarán al volver la conexión{/if}
		{/if}
	</button>
{/if}

{#if $coachRejectedChanges.length}
	<section class="rejected" role="alert">
		<div class="head">
			<strong>El servidor no aceptó algunos cambios</strong>
			<button type="button" class="close" aria-label="Cerrar" onclick={dismissCoachRejectedChanges}>
				<Icon name="x" size={16} />
			</button>
		</div>
		<ul>
			{#each $coachRejectedChanges as change (change.mutationId)}
				<li>
					{nouns[change.entity] ?? 'Cambio'}
					{#if names.get(change.clientId)}de {names.get(change.clientId)}{/if}: {change.error}
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if $coachData}
	{@render children()}
{:else}
	<p class="muted loading">
		{$coachSyncStatus.phase === 'offline'
			? 'Sin conexión. Conéctate una vez para descargar los datos de tus clientes.'
			: 'Cargando tus clientes…'}
	</p>
{/if}

<style>
	.sync {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		margin-bottom: 1.25rem;
		padding: 0.6rem 0.8rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-control);
		background: var(--color-surface);
		color: var(--color-subtle);
		font-size: 0.85rem;
		text-align: left;
		cursor: pointer;
	}
	.rejected {
		margin-bottom: 1.25rem;
		padding: 0.75rem 0.875rem;
		border: 1px solid color-mix(in srgb, var(--color-bad) 45%, transparent);
		border-left: 3px solid var(--color-bad);
		border-radius: var(--radius-control);
		background: color-mix(in srgb, var(--color-bad) 8%, var(--color-bg));
		font-size: 0.88rem;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.close {
		border: 0;
		background: none;
		color: var(--color-muted);
		cursor: pointer;
	}
	ul {
		margin: 0.5rem 0 0;
		padding-left: 1.1rem;
	}
	.loading {
		padding: 2rem 0;
	}
</style>
