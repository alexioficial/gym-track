<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	interface Props {
		icon?: string;
		title: string;
		message?: string;
		children?: Snippet;
	}
	let { icon = 'zap', title, message = '', children }: Props = $props();
</script>

<div class="empty card">
	<div class="empty-icon">
		<Icon name={icon} size={26} />
	</div>
	<h3 class="empty-title">{title}</h3>
	{#if message}
		<p class="empty-msg muted">{message}</p>
	{/if}
	{#if children}
		<div class="empty-action">{@render children()}</div>
	{/if}
</div>

<style>
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.5rem;
		padding: 2.5rem 1.5rem;
	}
	.empty-icon {
		display: grid;
		place-items: center;
		width: 3.25rem;
		height: 3.25rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		color: var(--color-accent-bright);
		margin-bottom: 0.25rem;
	}
	.empty-title {
		font-size: 1.05rem;
		font-weight: 700;
	}
	.empty-msg {
		font-size: 0.9rem;
		max-width: 24rem;
	}
	.empty-action {
		margin-top: 0.75rem;
	}
</style>
