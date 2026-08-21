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
	<div class="app-shell">
		<aside class="desktop-rail">
			<a href={resolve('/')} class="brand rail-brand" aria-label="Gym Track home">
				<span class="brand-mark"><Icon name="dumbbell" size={19} stroke={2.5} /></span>
				<span class="brand-word">GYM TRACK</span>
			</a>
			<Nav variant="rail" />
			<div class="rail-account">
				{#if data.user}
					<div class="rail-user">
						<span class="rail-user-label">Signed in</span>
						<strong title={data.user.username}>{data.user.username}</strong>
					</div>
					{#if data.user.isAdmin}
						<a class="rail-action" href={resolve('/admin')}>
							<Icon name="users" size={18} />
							<span>Administration</span>
						</a>
					{/if}
				{/if}
				<button class="rail-action" onclick={logout}>
					<Icon name="logout" size={18} />
					<span>Log out</span>
				</button>
				{#if data.user}<SyncIndicator />{/if}
			</div>
		</aside>

		<div class="app-main">
			<header class="topbar">
				<div class="topbar-inner">
					<a href={resolve('/')} class="brand" aria-label="Gym Track home">
						<span class="brand-mark"><Icon name="dumbbell" size={18} stroke={2.5} /></span>
					</a>
					<div class="account">
						{#if data.user}
							<span class="user-name" title={data.user.username}>{data.user.username}</span>
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
		</div>

		<Nav variant="bottom" />
	</div>
{/if}

<style>
	.app-shell {
		min-height: 100dvh;
	}
	.desktop-rail {
		display: none;
	}
	.topbar {
		position: sticky;
		top: 0;
		z-index: 30;
		padding: calc(0.625rem + env(safe-area-inset-top)) 1rem 0.625rem;
		border-bottom: 1px solid var(--color-border);
		background: color-mix(in srgb, var(--color-bg) 94%, transparent);
		backdrop-filter: blur(12px);
	}
	.topbar-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		text-decoration: none;
		color: var(--color-text);
	}
	.brand-mark {
		display: grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 0.25rem;
		background: var(--color-accent);
		color: var(--color-bg);
	}
	.brand-word {
		font-family: var(--font-display);
		font-size: 1.15rem;
		font-weight: 700;
		letter-spacing: 0.08em;
	}
	.account {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}
	.user-name {
		max-width: 10rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-subtle);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.icon-btn {
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: 0.25rem;
		background: transparent;
		border: 1px solid transparent;
		color: var(--color-subtle);
		text-decoration: none;
		cursor: pointer;
	}
	@media (hover: hover) {
		.icon-btn:hover {
			background: var(--color-surface);
			color: var(--color-text);
		}
	}
	.icon-btn:active {
		background: var(--color-surface-2);
	}
	.content {
		width: min(100%, 70rem);
		margin-inline: auto;
		padding: 1.5rem 1rem calc(5.75rem + env(safe-area-inset-bottom));
	}
	@media (max-width: 400px) {
		.user-name {
			display: none;
		}
	}

	@media (min-width: 960px) {
		.app-shell {
			display: grid;
			grid-template-columns: 13rem minmax(0, 1fr);
		}
		.desktop-rail {
			position: sticky;
			top: 0;
			display: grid;
			grid-template-rows: auto 1fr auto;
			gap: 2rem;
			height: 100dvh;
			padding: 1.5rem 1rem;
			border-right: 1px solid var(--color-border);
			background: var(--color-bg);
		}
		.rail-brand {
			padding-inline: 0.75rem;
		}
		.rail-account {
			display: grid;
			gap: 0.25rem;
			padding-top: 1rem;
			border-top: 1px solid var(--color-border);
		}
		.rail-user {
			display: grid;
			gap: 0.125rem;
			min-width: 0;
			padding: 0.5rem 0.75rem 0.75rem;
		}
		.rail-user-label {
			color: var(--color-muted);
			font-size: 0.7rem;
			letter-spacing: 0.08em;
			text-transform: uppercase;
		}
		.rail-user strong {
			overflow: hidden;
			color: var(--color-subtle);
			font-size: 0.9rem;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.rail-action {
			display: flex;
			min-height: 2.75rem;
			align-items: center;
			gap: 0.75rem;
			padding: 0.5rem 0.75rem;
			border: 0;
			background: transparent;
			color: var(--color-muted);
			font-size: 0.875rem;
			text-align: left;
			text-decoration: none;
			cursor: pointer;
		}
		@media (hover: hover) {
			.rail-action:hover {
				background: var(--color-surface);
				color: var(--color-text);
			}
		}
		.app-main {
			min-width: 0;
		}
		.topbar {
			display: none;
		}
		.content {
			padding: 2.5rem clamp(2rem, 5vw, 4rem) 4rem;
		}
	}
</style>
