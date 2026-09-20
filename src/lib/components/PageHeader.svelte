<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		subtitle?: string;
		action?: Snippet;
	}
	let { title, subtitle = '', action }: Props = $props();
</script>

<header class="page-header">
	<div class="page-header-text">
		<h1 class="page-title">{title}</h1>
		{#if subtitle}
			<p class="page-subtitle muted">{subtitle}</p>
		{/if}
	</div>
	{#if action}
		<div class="page-header-action">{@render action()}</div>
	{/if}
</header>

<style>
	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}
	.page-title {
		margin: 0;
		font-size: clamp(1.75rem, 4vw, 2rem);
		font-weight: 700;
		line-height: 0.95;
		letter-spacing: 0.025em;
	}
	.page-subtitle {
		margin: 0.5rem 0 0;
		font-size: 0.925rem;
		line-height: 1.4;
	}
	.page-header-action {
		flex-shrink: 0;
	}
	@media (max-width: 480px) {
		.page-header {
			align-items: flex-end;
			gap: 0.75rem;
			margin-bottom: 1.5rem;
		}
		.page-header-text {
			min-width: 0;
		}
	}
</style>
