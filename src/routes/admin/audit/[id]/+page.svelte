<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const json = $derived(JSON.stringify(data.record, null, 2));
</script>
<svelte:head><title>Decrypted request · Gym Tracker</title></svelte:head>
<PageHeader title="Decrypted request" subtitle="Sensitive data — visible only to this administrator session.">
	{#snippet action()}<a href="/admin/audit" class="btn btn-subtle btn-sm"><Icon name="trending" size={15} /> Back</a>{/snippet}
</PageHeader>
<p class="warning">Do not copy, share, or screenshot this record. It may contain passwords, session cookies and other sensitive request data.</p>
<pre class="card payload">{json}</pre>
<style>.btn-sm { min-height: 2.2rem; padding: .4rem .7rem; font-size: .8rem; }.warning { border: 1px solid color-mix(in srgb, var(--color-bad) 35%, transparent); background: color-mix(in srgb, var(--color-bad) 10%, transparent); color: var(--color-subtle); border-radius: .7rem; padding: .8rem .9rem; font-size: .84rem; margin-bottom: 1rem; }.payload { padding: 1rem; overflow: auto; max-height: 70vh; white-space: pre-wrap; word-break: break-word; color: var(--color-subtle); font-size: .76rem; line-height: 1.5; }</style>
