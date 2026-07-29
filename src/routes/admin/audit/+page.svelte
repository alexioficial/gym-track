<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	function dateTime(value: string): string { return new Date(value).toLocaleString(); }
</script>

<svelte:head><title>Request audit · Gym Tracker</title></svelte:head>

<PageHeader title="Request audit" subtitle="Encrypted request records retained for 30 days.">
	{#snippet action()}<a href="/admin" class="btn btn-subtle btn-sm"><Icon name="users" size={15} /> Users</a>{/snippet}
</PageHeader>
<p class="notice">Only an authenticated administrator can request decryption. Raw headers, cookies and bodies are never stored in readable form in MongoDB.</p>

<form class="filters card" method="GET">
	<div class="filter-grid">
		<label><span>From</span><input class="input" type="date" name="from" value={data.filters.from ?? ''} /></label>
		<label><span>To</span><input class="input" type="date" name="to" value={data.filters.to ?? ''} /></label>
		<label><span>Method</span><select class="input" name="method" value={data.filters.method ?? ''}><option value="">All</option><option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option><option>OPTIONS</option></select></label>
		<label><span>Path (exact)</span><input class="input" name="path" placeholder="/api/auth/login" value={data.filters.path ?? ''} /></label>
		<label><span>Client</span><select class="input" name="client" value={data.filters.client ?? ''}><option value="">All</option><option value="web">Web</option><option value="mobile-app">Mobile app</option><option value="unknown">Unknown</option></select></label>
		<label><span>Status</span><input class="input" name="status" inputmode="numeric" placeholder="200" value={data.filters.status ?? ''} /></label>
	</div>
	<div class="filter-actions"><a href="/admin/audit" class="btn btn-subtle">Clear</a><button class="btn btn-primary"><Icon name="trending" size={15} /> Apply filters</button></div>
</form>
<p class="count muted">Showing {data.items.length} most recent matching requests (up to 100).</p>
{#if data.items.length}
	<div class="stack">
		{#each data.items as item (item.id)}
			<a class="record card" href={`/admin/audit/${item.id}`}><div class="record-top"><code class:bad={item.status >= 400}>{item.method} {item.path}</code><strong class:bad={item.status >= 400}>{item.status}</strong></div><div class="meta"><span>{dateTime(item.createdAt)}</span><span>{item.clientKind}</span><span>{item.reportedClientIp ?? 'IP unavailable'}</span><span>{item.durationMs} ms</span></div></a>
		{/each}
	</div>
{:else}
	<section class="card empty"><Icon name="trending" size={24} /><p>No requests match these filters.</p></section>
{/if}

<style>
	.notice { border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent); background: color-mix(in srgb, var(--color-accent) 8%, transparent); border-radius: .7rem; padding: .8rem .9rem; color: var(--color-subtle); font-size: .84rem; margin-bottom: 1rem; }
	.filters { padding: 1rem; } .filter-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; } label { display: grid; gap: .3rem; min-width: 0; color: var(--color-muted); font-size: .75rem; font-weight: 650; } .filter-actions { display: flex; justify-content: flex-end; gap: .5rem; margin-top: .9rem; } .btn-sm { min-height: 2.2rem; padding: .4rem .7rem; font-size: .8rem; } .count { font-size: .8rem; margin: 1rem 0 .6rem; } .stack { display: grid; gap: .55rem; } .record { display: block; padding: .75rem .85rem; text-decoration: none; color: var(--color-text); transition: border-color .15s ease, transform .1s ease; } .record:hover { border-color: var(--color-accent); } .record:active { transform: scale(.99); } .record-top { display: flex; justify-content: space-between; gap: .7rem; align-items: center; } .record code { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--color-subtle); font-size: .82rem; } .record-top strong { color: var(--color-good); font-size: .82rem; } .bad { color: var(--color-bad) !important; } .meta { display: flex; flex-wrap: wrap; gap: .2rem .7rem; color: var(--color-muted); font-size: .72rem; margin-top: .45rem; } .empty { padding: 2rem; text-align: center; color: var(--color-muted); } .empty :global(svg) { color: var(--color-accent); } @media (min-width: 640px) { .filter-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
</style>
