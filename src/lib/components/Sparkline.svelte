<script lang="ts">
	interface Props {
		values: number[];
		width?: number;
		height?: number;
		color?: string;
	}
	let {
		values,
		width = 84,
		height = 30,
		color = 'var(--color-accent-bright)'
	}: Props = $props();

	const coords = $derived.by(() => {
		if (values.length === 0) return [] as { x: number; y: number }[];
		const min = Math.min(...values);
		const max = Math.max(...values);
		const range = max - min || 1;
		const n = values.length;
		const pad = 3;
		return values.map((v, i) => ({
			x: n === 1 ? width / 2 : pad + (i / (n - 1)) * (width - pad * 2),
			y: pad + (1 - (v - min) / range) * (height - pad * 2)
		}));
	});

	const line = $derived(coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' '));
	const last = $derived(coords.at(-1));
</script>

<svg {width} {height} viewBox="0 0 {width} {height}" class="spark" aria-hidden="true">
	{#if coords.length > 1}
		<polyline
			points={line}
			fill="none"
			stroke={color}
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{/if}
	{#if last}
		<circle cx={last.x} cy={last.y} r="2.6" fill={color} />
	{/if}
</svg>

<style>
	.spark {
		display: block;
	}
</style>
