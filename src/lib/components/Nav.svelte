<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Icon from './Icon.svelte';

	interface Props {
		variant?: 'rail' | 'bottom';
	}

	let { variant = 'bottom' }: Props = $props();

	const items = [
		{ href: resolve('/'), label: 'Home', icon: 'home' },
		{ href: resolve('/routines'), label: 'Routines', icon: 'calendar' },
		{ href: resolve('/log'), label: 'Log', icon: 'plus' },
		{ href: resolve('/progress'), label: 'Progress', icon: 'trending' },
		{ href: resolve('/exercises'), label: 'Exercises', icon: 'dumbbell' }
	];

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		if (href === '/') return path === '/';
		return path === href || path.startsWith(href + '/');
	}
</script>

<nav class="nav {variant}" aria-label={variant === 'rail' ? 'Primary navigation' : 'Mobile navigation'}>
	{#each items as item (item.href)}
		<a
			href={item.href}
			class="nav-item"
			class:active={isActive(item.href)}
			aria-current={isActive(item.href) ? 'page' : undefined}
		>
			<span class="nav-icon"><Icon name={item.icon} size={20} stroke={item.icon === 'plus' ? 2.5 : 2} /></span>
			<span class="nav-label">{item.label}</span>
		</a>
	{/each}
</nav>

<style>
	.nav {
		display: grid;
		gap: 0.25rem;
	}

	.bottom {
		position: fixed;
		inset: auto 0 0;
		z-index: 40;
		grid-template-columns: repeat(5, 1fr);
		padding: 0.375rem 0.5rem calc(0.375rem + env(safe-area-inset-bottom));
		border-top: 1px solid var(--color-border);
		background: color-mix(in srgb, var(--color-bg) 94%, transparent);
		backdrop-filter: blur(12px);
	}

	.rail {
		grid-template-columns: 1fr;
		align-content: start;
		gap: 0.25rem;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 2.875rem;
		padding: 0.5rem 0.75rem;
		border-left: 3px solid transparent;
		border-radius: 0;
		color: var(--color-muted);
		text-decoration: none;
	}
	@media (hover: hover) {
		.nav-item:hover {
			background: var(--color-surface);
			color: var(--color-text);
		}
	}
	.nav-item:active { background: var(--color-surface-2); }
	.nav-item.active {
		border-left-color: var(--color-accent);
		background: var(--color-surface);
		color: var(--color-accent-bright);
	}

	.nav-label {
		font-size: 0.9rem;
		font-weight: 600;
	}

	.nav-icon {
		display: grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		flex: 0 0 1.5rem;
	}

	.bottom .nav-item {
		flex-direction: column;
		justify-content: center;
		gap: 0.125rem;
		min-height: 3.5rem;
		padding: 0.375rem 0.25rem;
		border-top: 2px solid transparent;
		border-left: 0;
	}

	.bottom .nav-item.active {
		border-top-color: var(--color-accent);
		background: transparent;
	}

	.bottom .nav-label { font-size: 0.68rem; }

	@media (min-width: 960px) {
		.bottom { display: none; }
	}

	@media (max-width: 959px) {
		.rail { display: none; }
	}
</style>
