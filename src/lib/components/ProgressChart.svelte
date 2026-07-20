<script lang="ts">
	import { UNIT, type WeeklyStat } from '$lib/types';

	interface Props {
		weeks: WeeklyStat[];
	}
	let { weeks }: Props = $props();

	// Geometry (fixed viewBox, scales to 100% of the container).
	const W = 340;
	const H = 180;
	const PL = 10;
	const PR = 10;
	const PT = 22;
	const PB = 30;
	const plotW = W - PL - PR;
	const plotH = H - PT - PB;

	const geo = $derived.by(() => {
		const n = weeks.length;
		if (n === 0) return null;

		const e1rms = weeks.map((w) => w.bestE1rm);
		const vols = weeks.map((w) => w.totalVolume);
		const eMin = Math.min(...e1rms);
		const eMax = Math.max(...e1rms);
		const eRange = eMax - eMin || 1;
		const vMax = Math.max(...vols) || 1;
		const barW = Math.min(30, (plotW / n) * 0.55);

		const points = weeks.map((w, i) => {
			const cx = n === 1 ? PL + plotW / 2 : PL + (i / (n - 1)) * plotW;
			const ey = PT + (1 - (w.bestE1rm - eMin) / eRange) * plotH;
			const bh = (w.totalVolume / vMax) * plotH;
			return {
				cx,
				ey,
				barX: cx - barW / 2,
				barY: PT + plotH - bh,
				barH: bh,
				barW,
				label: w.label,
				e1rm: w.bestE1rm
			};
		});

		const line = points.map((p) => `${p.cx.toFixed(1)},${p.ey.toFixed(1)}`).join(' ');
		// X-axis labels: first, last and a few in between.
		const showEvery = Math.ceil(n / 4);
		const labels = points.filter((_, i) => i === 0 || i === n - 1 || i % showEvery === 0);

		return { points, line, labels, eMin, eMax };
	});
</script>

{#if geo}
	<div class="chart card">
		<div class="legend">
			<span class="lg lg-line">e1RM</span>
			<span class="lg lg-bar">Volume</span>
		</div>
		<svg viewBox="0 0 {W} {H}" class="svg" role="img" aria-label="Progress by week">
			<!-- volume bars -->
			{#each geo.points as p (p.cx)}
				<rect
					x={p.barX}
					y={p.barY}
					width={p.barW}
					height={Math.max(0, p.barH)}
					rx="3"
					class="bar"
				/>
			{/each}

			<!-- e1RM line -->
			{#if geo.points.length > 1}
				<polyline points={geo.line} class="e-line" />
			{/if}
			{#each geo.points as p (p.cx)}
				<circle cx={p.cx} cy={p.ey} r="3.2" class="e-dot" />
			{/each}

			<!-- e1RM max/min labels -->
			<text x={PL} y={12} class="axis-val">{geo.eMax} {UNIT}</text>

			<!-- x-axis labels -->
			{#each geo.labels as p (p.cx)}
				<text x={p.cx} y={H - 10} class="axis-x" text-anchor="middle">{p.label}</text>
			{/each}
		</svg>
	</div>
{/if}

<style>
	.chart {
		padding: 1rem 0.85rem 0.6rem;
	}
	.legend {
		display: flex;
		gap: 1rem;
		padding: 0 0.25rem 0.25rem;
	}
	.lg {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--color-muted);
	}
	.lg::before {
		content: '';
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 2px;
	}
	.lg-line::before {
		background: var(--color-accent-bright);
		border-radius: 999px;
	}
	.lg-bar::before {
		background: color-mix(in srgb, var(--color-accent) 28%, transparent);
	}

	.svg {
		width: 100%;
		height: auto;
		display: block;
		overflow: visible;
	}
	.bar {
		fill: color-mix(in srgb, var(--color-accent) 22%, transparent);
	}
	.e-line {
		fill: none;
		stroke: var(--color-accent-bright);
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.e-dot {
		fill: var(--color-accent-bright);
		stroke: var(--color-bg);
		stroke-width: 1.5;
	}
	.axis-x {
		fill: var(--color-muted);
		font-size: 9px;
		font-weight: 600;
	}
	.axis-val {
		fill: var(--color-subtle);
		font-size: 9px;
		font-weight: 700;
	}
</style>
