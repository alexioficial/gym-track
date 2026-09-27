<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { dismissRejectedChanges, rejectedChanges } from './store';
	import type { RejectedChange } from './types';

	const nouns: Record<RejectedChange['entity'], string> = {
		exercise: 'Ejercicio',
		routine: 'Rutina',
		session: 'Entrenamiento',
		schedule: 'Calendario',
		settings: 'Ajuste'
	};
	const verbs: Record<RejectedChange['operation'], string> = {
		create: 'nuevo',
		update: 'editado',
		delete: 'borrado',
		set: 'actualizado'
	};
</script>

{#if $rejectedChanges.length}
	<section class="rejected" role="alert">
		<div class="head">
			<strong>
				{$rejectedChanges.length === 1
					? 'No se pudo guardar un cambio'
					: `No se pudieron guardar ${$rejectedChanges.length} cambios`}
			</strong>
			<button type="button" class="close" aria-label="Cerrar" onclick={dismissRejectedChanges}>
				<Icon name="x" size={16} />
			</button>
		</div>
		<ul>
			{#each $rejectedChanges as change (change.mutationId)}
				<li>{nouns[change.entity]} {verbs[change.operation]}: {change.error}</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	.rejected {
		margin-bottom: 1.25rem;
		padding: 0.75rem 0.875rem;
		border: 1px solid color-mix(in srgb, var(--color-bad) 45%, transparent);
		border-left: 3px solid var(--color-bad);
		border-radius: var(--radius-control);
		background: color-mix(in srgb, var(--color-bad) 8%, var(--color-bg));
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}
	strong {
		font-size: 0.9rem;
		font-weight: 600;
	}
	.close {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border: 0;
		background: transparent;
		color: var(--color-subtle);
		cursor: pointer;
	}
	ul {
		margin: 0.25rem 0 0;
		padding-left: 1.1rem;
		color: var(--color-subtle);
		font-size: 0.85rem;
		line-height: 1.45;
	}
</style>
