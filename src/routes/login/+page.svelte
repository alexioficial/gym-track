<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<svelte:head><title>Entrar · Gym Tracker</title></svelte:head>

<div class="login-wrap">
	<div class="login-card card">
		<div class="brand-mark"><Icon name="dumbbell" size={26} stroke={2.5} /></div>
		<h1 class="login-title">GYM<span class="accent">TRACK</span></h1>
		<p class="muted login-sub">Tu tracker de sobrecarga progresiva</p>

		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					await update();
					loading = false;
				};
			}}
		>
			<label class="label" for="pin">PIN de acceso</label>
			<input
				id="pin"
				name="pin"
				type="password"
				inputmode="numeric"
				autocomplete="current-password"
				placeholder="••••"
				class="input pin-input"
				autofocus
			/>

			{#if form?.error}
				<p class="error">{form.error}</p>
			{/if}

			<button type="submit" class="btn btn-primary login-btn" disabled={loading}>
				{#if loading}Entrando…{:else}<Icon name="lock" size={16} /> Entrar{/if}
			</button>
		</form>
	</div>
</div>

<style>
	.login-wrap {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 1.5rem;
	}
	.login-card {
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
	.login-title {
		margin-top: 1rem;
		font-size: 1.5rem;
		font-weight: 800;
		letter-spacing: 0.02em;
	}
	.login-sub {
		font-size: 0.88rem;
		margin-top: 0.2rem;
	}
	form {
		width: 100%;
		margin-top: 1.75rem;
		text-align: left;
	}
	.pin-input {
		text-align: center;
		letter-spacing: 0.5em;
		font-size: 1.2rem;
		padding: 0.75rem;
	}
	.error {
		color: var(--color-bad);
		font-size: 0.85rem;
		margin-top: 0.6rem;
		text-align: center;
	}
	.login-btn {
		width: 100%;
		margin-top: 1rem;
		padding: 0.8rem;
	}
</style>
