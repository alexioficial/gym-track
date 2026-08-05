<script lang="ts">
	import { synchronize, syncStatus } from './store';

	const label = $derived.by(() => {
		if ($syncStatus.phase === 'syncing') return 'Syncing changes…';
		if ($syncStatus.phase === 'offline') return 'Offline';
		if ($syncStatus.phase === 'error') return 'Sync paused';
		if ($syncStatus.pending > 0) return `${$syncStatus.pending} change${$syncStatus.pending === 1 ? '' : 's'} pending`;
		return 'Synced';
	});
	const tone = $derived($syncStatus.phase);
</script>

<button
	class:offline={tone === 'offline'}
	class:error={tone === 'error'}
	class:busy={tone === 'syncing'}
	class="sync"
	title={$syncStatus.message ?? 'Synchronize now'}
	onclick={() => void synchronize()}
>
	<span class="dot"></span>{label}
</button>

<style>
	.sync {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border: 0;
		background: transparent;
		color: var(--color-muted);
		font: inherit;
		font-size: 0.72rem;
		padding: 0.25rem 0;
		cursor: pointer;
	}
	.dot {
		width: 0.42rem;
		height: 0.42rem;
		border-radius: 999px;
		background: var(--color-good);
	}
	.offline .dot {
		background: var(--color-accent);
	}
	.error .dot {
		background: var(--color-bad);
	}
	.busy .dot {
		background: var(--color-accent);
		animation: pulse 1s ease-in-out infinite;
	}
	@keyframes pulse {
		50% {
			opacity: 0.35;
		}
	}
</style>
