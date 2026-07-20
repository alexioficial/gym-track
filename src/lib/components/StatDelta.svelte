<script lang="ts">
	import Icon from './Icon.svelte';

	interface Props {
		value: number;
		unit?: string;
		/** When 0, show it as neutral? */
		neutralOnZero?: boolean;
	}
	let { value, unit = '', neutralOnZero = true }: Props = $props();

	const up = $derived(value > 0);
	const down = $derived(value < 0);
	const display = $derived(`${value > 0 ? '+' : ''}${value}${unit}`);
</script>

<span class="delta stat-num" class:up class:down class:neutral={value === 0 && neutralOnZero}>
	{#if up}
		<Icon name="up" size={12} stroke={2.5} />
	{:else if down}
		<Icon name="down" size={12} stroke={2.5} />
	{/if}
	{display}
</span>

<style>
	.delta {
		display: inline-flex;
		align-items: center;
		gap: 0.15rem;
		font-size: 0.82rem;
		font-weight: 600;
	}
	.up {
		color: var(--color-good);
	}
	.down {
		color: var(--color-bad);
	}
	.neutral {
		color: var(--color-muted);
	}
</style>
