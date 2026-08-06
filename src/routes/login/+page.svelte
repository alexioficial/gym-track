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
	<div class="auth-card card">
		<div class="brand-mark"><Icon name="dumbbell" size={26} stroke={2.5} /></div>
		<h1 class="auth-title">GYM<span class="accent">TRACK</span></h1>
		<p class="muted auth-sub">Sign in to your account</p>

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

			{#if loginError}
				<p class="error">{loginError}</p>
			{/if}

			<button type="submit" class="btn btn-primary auth-btn" disabled={loading}>
				{#if loading}Signing in…{:else}<Icon name="lock" size={16} /> Sign in{/if}
			</button>
		</form>
	</div>
</div>

<style>
	.auth-wrap {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 1.5rem;
	}
	.auth-card {
		width: 100%;
		max-width: 22rem;
		padding: 2rem 1.75rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}
	.brand-mark {
		display: grid;
		place-items: center;
		width: 3.25rem;
		height: 3.25rem;
		border-radius: 1rem;
		background: var(--color-accent);
		color: #0a0a0a;
		box-shadow: 0 10px 30px rgba(234, 179, 8, 0.28);
	}
	.auth-title {
		margin-top: 1rem;
		font-size: 1.5rem;
		font-weight: 800;
		letter-spacing: 0.02em;
	}
	.auth-sub {
		font-size: 0.88rem;
		margin-top: 0.2rem;
	}
	form {
		width: 100%;
		margin-top: 1.75rem;
		text-align: left;
	}
	.field {
		margin-bottom: 0.9rem;
	}
	.error {
		color: var(--color-bad);
		font-size: 0.85rem;
		margin: -0.2rem 0 0.6rem;
		text-align: center;
	}
	.auth-btn {
		width: 100%;
		margin-top: 0.25rem;
		padding: 0.8rem;
	}
</style>
