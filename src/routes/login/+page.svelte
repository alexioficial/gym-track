<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { jsonRequest, ClientApiError } from '$lib/client/json';

	let loading = $state(false);
	let loginError = $state<string | null>(null);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (loading) return;
		const data = new FormData(event.currentTarget as HTMLFormElement);
		loading = true;
		loginError = null;
		try {
			await jsonRequest('/api/auth/login', 'POST', {
				username: String(data.get('username') ?? '').trim(),
				password: String(data.get('password') ?? '')
			});
			window.location.assign('/');
		} catch (error) {
			loginError = error instanceof ClientApiError ? error.message : 'Could not reach the API';
			loading = false;
		}
	}
</script>

<svelte:head><title>Sign in - Gym Tracker</title></svelte:head>

<div class="auth-wrap">
	<main class="auth-sheet">
		<section class="identity" aria-label="Training Ledger">
			<div class="brand-mark"><Icon name="dumbbell" size={24} stroke={2.5} /></div>
			<p class="eyebrow">Training Ledger</p>
			<h1>Pick up where<br />you left off.</h1>
			<p class="identity-copy">
				Your routines, working sets and training history in one focused record.
			</p>
		</section>

		<section class="sign-in">
			<p class="eyebrow accent">Account access</p>
			<h2>Sign in</h2>
			<p class="muted auth-sub">Use your Gym Tracker account.</p>

			<form onsubmit={submit}>
				<label class="label" for="username">Username</label>
				<input
					id="username"
					name="username"
					type="text"
					autocomplete="username"
					autocapitalize="none"
					autocorrect="off"
					spellcheck="false"
					placeholder="username"
					class="input field"
					required
				/>

				<label class="label" for="password">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					autocomplete="current-password"
					placeholder="••••••••"
					class="input field"
					required
				/>

				{#if loginError}<p class="error">{loginError}</p>{/if}

				<button type="submit" class="btn btn-primary auth-btn" disabled={loading}>
					{#if loading}Signing in…{:else}<Icon name="lock" size={16} /> Sign in{/if}
				</button>
			</form>
		</section>
	</main>
</div>

<style>
	.auth-wrap {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 1.25rem;
	}
	.auth-sheet {
		width: 100%;
		max-width: 58rem;
		display: grid;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
	}
	.identity,
	.sign-in {
		padding: clamp(2rem, 6vw, 4.5rem);
	}
	.identity {
		position: relative;
		display: flex;
		min-height: 32rem;
		flex-direction: column;
		justify-content: flex-end;
		border-right: 1px solid var(--color-border);
		background: var(--color-bg);
	}
	.identity::before {
		position: absolute;
		inset: 0 auto 0 0;
		width: 0.3rem;
		background: var(--color-accent);
		content: '';
	}
	.brand-mark {
		position: absolute;
		top: clamp(2rem, 6vw, 4.5rem);
		left: clamp(2rem, 6vw, 4.5rem);
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: var(--radius-control);
		background: var(--color-accent);
		color: var(--color-bg);
	}
	.eyebrow {
		margin: 0 0 0.75rem;
		color: var(--color-subtle);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.13em;
		text-transform: uppercase;
	}
	.identity h1 {
		margin: 0;
		font-size: clamp(2.6rem, 7vw, 4.5rem);
		font-weight: 700;
		line-height: 0.86;
	}
	.identity-copy {
		max-width: 25rem;
		margin: 1.25rem 0 0;
		color: var(--color-muted);
	}
	.sign-in {
		display: flex;
		flex-direction: column;
		justify-content: center;
	}
	.sign-in h2 {
		margin: 0;
		font-size: 2.5rem;
		line-height: 1;
	}
	.auth-sub {
		font-size: 0.9rem;
		margin: 0.45rem 0 0;
	}
	form {
		width: 100%;
		margin-top: 2rem;
		text-align: left;
	}
	.field {
		margin-bottom: 0.9rem;
	}
	.error {
		color: var(--color-bad);
		font-size: 0.85rem;
		margin: -0.2rem 0 0.75rem;
	}
	.auth-btn {
		width: 100%;
		margin-top: 0.25rem;
		padding: 0.8rem;
	}
	@media (min-width: 720px) {
		.auth-sheet {
			grid-template-columns: 1.1fr 0.9fr;
		}
	}
	@media (max-width: 719px) {
		.auth-wrap {
			place-items: stretch;
			padding: 0;
		}
		.auth-sheet {
			min-height: 100dvh;
			border: 0;
		}
		.identity {
			min-height: 15rem;
			padding: 5.5rem 1.5rem 1.75rem;
			border-right: 0;
			border-bottom: 1px solid var(--color-border);
		}
		.brand-mark {
			top: 1.5rem;
			left: 1.5rem;
		}
		.identity h1 {
			font-size: 2.75rem;
		}
		.identity-copy {
			display: none;
		}
		.sign-in {
			padding: 2.5rem 1.5rem;
		}
	}
</style>
