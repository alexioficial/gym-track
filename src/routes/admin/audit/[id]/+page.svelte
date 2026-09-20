<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const json = $derived(JSON.stringify(data.record, null, 2));
</script>

<svelte:head><title>Decrypted request · Gym Tracker</title></svelte:head>
<PageHeader
	title="Decrypted request"
	subtitle="Sensitive data — visible only to this administrator session."
>
	{#snippet action()}<a href="/admin/audit" class="btn btn-subtle btn-sm"
			><Icon name="trending" size={15} /> Back</a
		>{/snippet}
</PageHeader>
<p class="warning">
	Do not copy, share, or screenshot this record. It may contain passwords, session cookies and other
	sensitive request data.
</p>
<section class="payload-section" aria-label="Decrypted JSON payload">
	<p class="payload-label">Decrypted JSON</p>
	<pre class="payload">{json}</pre>
</section>

<style>
	.btn-sm {
		min-height: 2.2rem;
		padding: 0.4rem 0.7rem;
		font-size: 0.8rem;
	}
	.warning {
		border-left: 0.25rem solid var(--color-bad);
		color: var(--color-subtle);
		padding: 0.6rem 0 0.6rem 0.85rem;
		font-size: 0.84rem;
		margin-bottom: 1.25rem;
	}
	.payload-section {
		border-top: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
	}
	.payload-label {
		margin: 0;
		padding: 0.65rem 0;
		border-bottom: 1px solid var(--color-border);
		color: var(--color-muted);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	.payload {
		margin: 0;
		padding: 1rem 0;
		overflow: auto;
		max-height: 70vh;
		white-space: pre-wrap;
		word-break: break-word;
		color: var(--color-subtle);
		font-size: 0.76rem;
		line-height: 1.55;
	}
</style>
