<script lang="ts">
	import { page } from '$app/state';
	import {
		lengthUnitOf,
		offlineData,
		setLengthUnit,
		setWeightUnit,
		weightUnitOf
	} from '$lib/offline/store';
	import { LENGTH_UNITS, WEIGHT_UNITS, type LengthUnit, type WeightUnit } from '$lib/units';

	let { kind = 'weight' }: { kind?: 'weight' | 'length' } = $props();

	const options = $derived<readonly string[]>(kind === 'weight' ? WEIGHT_UNITS : LENGTH_UNITS);
	const unit = $derived<string>(
		kind === 'weight'
			? weightUnitOf($offlineData, page.data.user)
			: lengthUnitOf($offlineData, page.data.user)
	);

	function choose(option: string) {
		if (option === unit) return;
		if (kind === 'weight') void setWeightUnit(option as WeightUnit);
		else void setLengthUnit(option as LengthUnit);
	}
</script>

<div
	class="units"
	role="group"
	aria-label={kind === 'weight' ? 'Unidad de peso' : 'Unidad de longitud'}
>
	{#each options as option (option)}
		<button
			type="button"
			class:active={unit === option}
			aria-pressed={unit === option}
			disabled={!$offlineData}
			onclick={() => choose(option)}
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
