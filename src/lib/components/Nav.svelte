<script lang="ts">
	import { page } from '$app/state';
	import Icon from './Icon.svelte';

	const items = [
		{ href: '/', label: 'Inicio', icon: 'home' },
		{ href: '/routines', label: 'Rutinas', icon: 'calendar' },
		{ href: '/log', label: 'Registrar', icon: 'plus' },
		{ href: '/progress', label: 'Progreso', icon: 'trending' },
		{ href: '/exercises', label: 'Ejercicios', icon: 'dumbbell' }
	];

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		if (href === '/') return path === '/';
		return path === href || path.startsWith(href + '/');
	}
</script>

<nav class="nav">
	{#each items as item (item.href)}
		<a href={item.href} class="nav-item" class:active={isActive(item.href)}>
			{#if item.icon === 'plus'}
				<span class="nav-fab"><Icon name="plus" size={22} stroke={2.5} /></span>
			{:else}
				<Icon name={item.icon} size={21} />
			{/if}
			<span class="nav-label">{item.label}</span>
		</a>
	{/each}
</nav>

<style>
	.nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 40;
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		align-items: end;
		gap: 0.25rem;
		padding: 0.5rem 0.5rem calc(0.5rem + env(safe-area-inset-bottom));
		background: color-mix(in srgb, var(--color-bg) 80%, transparent);
		backdrop-filter: blur(14px);
		border-top: 1px solid var(--color-border-soft);
	}

	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding: 0.4rem 0;
		color: var(--color-muted);
		text-decoration: none;
		transition: color 0.15s ease;
	}
	.nav-item:hover {
		color: var(--color-subtle);
	}
	.nav-item.active {
		color: var(--color-accent-bright);
	}

	.nav-label {
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.01em;
	}

	.nav-fab {
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		margin-top: -1.4rem;
		border-radius: 999px;
		background: var(--color-accent);
		color: #0a0a0a;
		box-shadow: 0 6px 20px rgba(234, 179, 8, 0.35);
		transition:
			background 0.15s ease,
			transform 0.15s ease;
	}
	.nav-item:hover .nav-fab {
		background: var(--color-accent-bright);
	}
	.nav-item.active .nav-fab {
		transform: translateY(-2px);
	}

	@media (min-width: 768px) {
		.nav {
			max-width: 30rem;
			margin: 0 auto;
			border-radius: 1.25rem;
			border: 1px solid var(--color-border);
			bottom: 1rem;
		}
	}
</style>
