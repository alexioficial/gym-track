<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Nav from '$lib/components/Nav.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import OfflineBootstrap from '$lib/offline/OfflineBootstrap.svelte';
	import SyncIndicator from '$lib/offline/SyncIndicator.svelte';
	import { clearOfflineData } from '$lib/offline/store';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	const bare = $derived(page.url.pathname === '/login');

	async function logout() {
		await clearOfflineData(data.user?.id);
		navigator.serviceWorker?.controller?.postMessage({ type: 'clear-user-data' });
		if (navigator.onLine) {
			await fetch('/api/auth/logout', {
				method: 'POST',
				headers: { accept: 'application/json' }
			}).catch(() => undefined);
		}
		window.location.assign(resolve('/login'));
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if bare}
	{@render children()}
{:else}
	{#if data.user && data.offline}
		<OfflineBootstrap userId={data.user.id} seed={data.offline} />
	{/if}
	<div class="app">
		<header class="topbar">
			<div class="topbar-inner">
				<a href={resolve('/')} class="brand">
					<span class="brand-mark"><Icon name="dumbbell" size={18} stroke={2.5} /></span>
				</a>
				<div class="account">
					{#if data.user}
						<span class="user-chip" title={data.user.username}>
							<span class="user-name">{data.user.username}</span>
						</span>
						{#if data.user.isAdmin}
							<a
								class="icon-btn"
								href={resolve('/admin')}
								title="Manage users"
								aria-label="Manage users"
							>
								<Icon name="users" size={18} />
							</a>
						{/if}
					{/if}
					<button class="icon-btn" title="Log out" aria-label="Log out" onclick={logout}>
						<Icon name="logout" size={18} />
					</button>
					{#if data.user}<SyncIndicator />{/if}
				</div>
			</div>
		</header>

		<main class="content">
			{@render children()}
		</main>

		<Nav />
	</div>
{/if}

<style>
	.topbar {
		position: sticky;
		top: 0;
		z-index: 30;
		padding: calc(0.85rem + env(safe-area-inset-top)) 1.1rem 0.85rem;
		background: color-mix(in srgb, var(--color-bg) 78%, transparent);
		backdrop-filter: blur(14px);
		border-bottom: 1px solid var(--color-border-soft);
	}
	.topbar-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		max-width: 44rem;
		margin: 0 auto;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		text-decoration: none;
		color: var(--color-text);
	}
	.brand-mark {
		display: grid;
		place-items: center;
		width: 1.9rem;
		height: 1.9rem;
		border-radius: 0.6rem;
		background: var(--color-accent);
		color: #0a0a0a;
	}
	.account {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.user-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		max-width: 11rem;
	}
	.user-name {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-subtle);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	@media (max-width: 400px) {
		.user-name {
			display: none;
		}
	}
	.icon-btn {
		display: grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		border-radius: 0.6rem;
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-subtle);
		text-decoration: none;
		cursor: pointer;
		transition:
			color 0.15s ease,
			border-color 0.15s ease,
			transform 0.1s ease;
	}
	@media (hover: hover) {
		.icon-btn:hover {
			color: var(--color-accent-bright);
			border-color: var(--color-accent);
		}
	}
	.icon-btn:active {
		transform: scale(0.94);
	}
	.content {
		max-width: 44rem;
		margin: 0 auto;
		padding: 1.5rem 1.1rem calc(6.5rem + env(safe-area-inset-bottom));
	}
	@media (min-width: 768px) {
		.content {
			padding-top: 2rem;
			padding-left: 1.5rem;
			padding-right: 1.5rem;
		}
	}
</style>
