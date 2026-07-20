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
		gap: 1rem;
		margin-bottom: 1.25rem;
	}
	.page-title {
		font-size: 1.6rem;
		font-weight: 800;
		line-height: 1.1;
	}
	.page-subtitle {
		font-size: 0.9rem;
		margin-top: 0.25rem;
	}
	.page-header-action {
		flex-shrink: 0;
	}
</style>
