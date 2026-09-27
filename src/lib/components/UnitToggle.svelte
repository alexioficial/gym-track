<script lang="ts">
	import { page } from '$app/state';
	import { offlineData, setWeightUnit, weightUnitOf } from '$lib/offline/store';
	import { WEIGHT_UNITS } from '$lib/units';

	const unit = $derived(weightUnitOf($offlineData, page.data.user));
</script>

<div class="units" role="group" aria-label="Weight unit">
	{#each WEIGHT_UNITS as option (option)}
		<button
			type="button"
			class:active={unit === option}
			aria-pressed={unit === option}
			disabled={!$offlineData}
			onclick={() => {
				if (unit !== option) void setWeightUnit(option);
			}}
		>
			{option}
		</button>
	{/each}
</div>

<style>
	.units {
		display: inline-flex;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-control);
		overflow: hidden;
	}
	button {
		min-width: 2.4rem;
		min-height: 2.25rem;
		padding: 0 0.55rem;
		border: 0;
		background: transparent;
		color: var(--color-muted);
		font-family: var(--font-display);
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
	}
	button.active {
		background: var(--color-accent);
		color: var(--color-bg);
	}
	button:disabled {
		cursor: default;
	}
</style>
