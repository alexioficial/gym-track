<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	function dateTime(value: string): string {
		return new Date(value).toLocaleString();
	}

	async function applyFilters(event: SubmitEvent) {
		event.preventDefault();
		const values = new FormData(event.currentTarget as HTMLFormElement);
		const query = new URLSearchParams();
		for (const [key, value] of values) {
			const normalized = String(value).trim();
			if (normalized) query.set(key, normalized);
		}
		const target = resolve('/admin/audit');
		await goto(query.size ? `${target}?${query}` : target);
	}

	async function clearFilters() {
		await goto(resolve('/admin/audit'));
	}
</script>

<svelte:head><title>Request audit · Gym Tracker</title></svelte:head>

<PageHeader title="Request audit" subtitle="Encrypted request records retained for 30 days.">
	{#snippet action()}<a href="/admin" class="btn btn-subtle btn-sm"
			><Icon name="users" size={15} /> Users</a
		>{/snippet}
</PageHeader>

<p class="notice">
	Only an authenticated administrator can request decryption. Raw headers, cookies and bodies are
	never stored in readable form in MongoDB.
</p>

<form class="filters" onsubmit={applyFilters}>
	<div class="filter-grid">
		<label
			><span>From</span><input
				class="input"
				type="date"
				name="from"
				value={data.filters.from ?? ''}
			/></label
		>
		<label
			><span>To</span><input
				class="input"
				type="date"
				name="to"
				value={data.filters.to ?? ''}
			/></label
		>
		<label
			><span>Method</span><select class="input" name="method" value={data.filters.method ?? ''}
				><option value="">All</option><option>GET</option><option>POST</option><option>PUT</option
				><option>DELETE</option><option>OPTIONS</option></select
			></label
		>
		<label
			><span>Path (exact)</span><input
				class="input"
				name="path"
				placeholder="/api/auth/login"
				value={data.filters.path ?? ''}
			/></label
		>
		<label
			><span>Client</span><select class="input" name="client" value={data.filters.client ?? ''}
				><option value="">All</option><option value="web">Web</option><option value="mobile-app"
					>Mobile app</option
				><option value="unknown">Unknown</option></select
			></label
		>
		<label
			><span>Status</span><input
				class="input"
				name="status"
				inputmode="numeric"
				placeholder="200"
				value={data.filters.status ?? ''}
			/></label
		>
	</div>
	<div class="filter-actions">
		<button type="button" class="btn btn-subtle" onclick={clearFilters}>Clear</button>
		<button type="submit" class="btn btn-primary">Apply filters</button>
	</div>
</form>

<p class="count muted">Showing {data.items.length} most recent matching requests (up to 100).</p>
{#if data.items.length}
	<div class="record-table" role="table" aria-label="Request audit records">
		<div class="record-head" role="row">
			<span>Request</span><span>Client</span><span>IP address</span><span>Time</span><span
				>Status</span
			>
		</div>
		{#each data.items as item (item.id)}
			<a class="record" href={`/admin/audit/${item.id}`} role="row">
				<code class:bad={item.status >= 400}>{item.method} {item.path}</code>
				<span>{item.clientKind}</span>
				<span>{item.reportedClientIp ?? 'IP unavailable'}</span>
				<span class="request-time"
					>{dateTime(item.createdAt)} <small>{item.durationMs} ms</small></span
				>
				<strong class:bad={item.status >= 400}>{item.status}</strong>
			</a>
		{/each}
	</div>
{:else}
	<section class="empty"><p>No requests match these filters.</p></section>
{/if}

<style>
	.notice {
		border-left: 0.25rem solid var(--color-accent);
		padding: 0.6rem 0 0.6rem 0.85rem;
		color: var(--color-subtle);
		font-size: 0.84rem;
		margin-bottom: 1rem;
	}
	.filters {
		padding: 1rem 0;
		border-top: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
	}
	.filter-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}
	label {
		display: grid;
		gap: 0.3rem;
		min-width: 0;
		color: var(--color-muted);
		font-size: 0.75rem;
		font-weight: 650;
	}
	.filter-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.9rem;
	}
	.btn-sm {
		min-height: 2.2rem;
		padding: 0.4rem 0.7rem;
		font-size: 0.8rem;
	}
	.count {
		font-size: 0.8rem;
		margin: 1rem 0 0.6rem;
	}
	.record-table {
		border-top: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
	}
	.record-head,
	.record {
		display: grid;
		grid-template-columns:
			minmax(15rem, 2fr) minmax(6rem, 0.6fr) minmax(8rem, 0.8fr) minmax(12rem, 1fr)
			3rem;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 0;
	}
	.record-head {
		color: var(--color-muted);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.09em;
		text-transform: uppercase;
		border-bottom: 1px solid var(--color-border);
	}
	.record {
		text-decoration: none;
		color: var(--color-text);
		border-bottom: 1px solid var(--color-border-soft);
	}
	.record:last-child {
		border-bottom: 0;
	}
	.record:hover {
		background: var(--color-surface);
	}
	.record code {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-subtle);
		font-size: 0.82rem;
	}
	.record strong {
		color: var(--color-good);
		font-size: 0.82rem;
		text-align: right;
	}
	.bad {
		color: var(--color-bad) !important;
	}
	.record > span {
		color: var(--color-muted);
		font-size: 0.78rem;
	}
	.request-time small {
		display: block;
		color: var(--color-muted);
	}
	.empty {
		padding: 2rem;
		text-align: center;
		color: var(--color-muted);
		border-top: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
	}
	@media (min-width: 640px) {
		.filter-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	@media (max-width: 859px) {
		.record-head {
			display: none;
		}
		.record {
			grid-template-columns: 1fr auto;
			gap: 0.25rem 0.75rem;
		}
		.record code {
			grid-column: 1;
		}
		.record strong {
			grid-column: 2;
			grid-row: 1;
		}
		.record > span {
			font-size: 0.72rem;
		}
		.record > span:nth-of-type(1),
		.record > span:nth-of-type(2) {
			grid-row: 2;
		}
		.record > span:nth-of-type(2) {
			text-align: right;
		}
		.request-time {
			grid-column: 1 / -1;
			grid-row: 3;
		}
		.request-time small {
			display: inline;
			margin-left: 0.5rem;
		}
	}
	@media (max-width: 479px) {
		.filter-grid {
			grid-template-columns: 1fr;
		}
		.filter-actions .btn {
			flex: 1;
		}
	}
</style>
