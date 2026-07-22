<script lang="ts">
	import { enhance } from '$app/forms';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let creating = $state(false);
	// Which user row has its reset-password field open.
	let resetOpen = $state<string | null>(null);

	function initials(username: string): string {
		return username.replace(/[._]/g, ' ').trim().slice(0, 2).toUpperCase();
	}
	function fmtDate(iso: string): string {
		return new Date(iso).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head><title>Users · Gym Tracker</title></svelte:head>

<PageHeader title="Users" subtitle="Create and manage who can sign in" />

{#if form?.error}
	<p class="banner banner-bad">{form.error}</p>
{:else if form?.ok === 'created'}
	<p class="banner banner-good">Created <strong>{form?.username}</strong>.</p>
{:else if form?.ok === 'reset'}
	<p class="banner banner-good">Password updated.</p>
{:else if form?.ok === 'deleted'}
	<p class="banner banner-good">User deleted.</p>
{/if}

<section class="card create-card">
	<h2 class="block-title"><Icon name="plus" size={16} /> New user</h2>
	<form
		method="POST"
		action="?/create"
		use:enhance={() => {
			creating = true;
			return async ({ update }) => {
				await update();
				creating = false;
			};
		}}
	>
		<div class="create-grid">
			<div>
				<label class="label" for="new-username">Username</label>
				<input
					id="new-username"
					name="username"
					type="text"
					class="input"
					placeholder="e.g. juan.perez"
					autocapitalize="none"
					autocorrect="off"
					spellcheck="false"
					pattern="[a-z0-9._]{'{'}3,30{'}'}"
					title="Lowercase letters, numbers, dots and underscores (3–30 chars)"
					value={form?.error ? (form?.username ?? '') : ''}
					required
				/>
			</div>
			<div>
				<label class="label" for="new-password">Password</label>
				<input
					id="new-password"
					name="password"
					type="text"
					class="input"
					placeholder="at least 6 characters"
					autocomplete="off"
					minlength="6"
					required
				/>
			</div>
		</div>
		<p class="hint muted">Usernames use lowercase letters, numbers, dots and underscores.</p>
		<button type="submit" class="btn btn-primary" disabled={creating}>
			{#if creating}Creating…{:else}<Icon name="check" size={16} /> Create user{/if}
		</button>
	</form>
</section>

<section class="block">
	<h2 class="block-title"><Icon name="users" size={16} /> All users ({data.users.length})</h2>
	<div class="stack">
		{#each data.users as u (u.id)}
			<div class="user card">
				<div class="user-main">
					<span class="avatar" class:avatar-admin={u.isAdmin}>{initials(u.username)}</span>
					<div class="user-info">
						<span class="user-name">
							{u.username}
							{#if u.isAdmin}<span class="badge badge-accent admin-badge">admin</span>{/if}
						</span>
						<span class="muted user-date">Added {fmtDate(u.createdAt)}</span>
					</div>

					{#if !u.isAdmin}
						<div class="user-actions">
							<button
								type="button"
								class="btn btn-subtle btn-sm"
								onclick={() => (resetOpen = resetOpen === u.id ? null : u.id)}
							>
								<Icon name="lock" size={14} /> Reset
							</button>
							<form
								method="POST"
								action="?/delete"
								use:enhance={({ cancel }) => {
									if (!confirm(`Delete user "${u.username}"? This cannot be undone.`)) cancel();
									return async ({ update }) => update();
								}}
							>
								<input type="hidden" name="id" value={u.id} />
								<button type="submit" class="btn btn-danger btn-sm" aria-label="Delete user">
									<Icon name="trash" size={14} />
								</button>
							</form>
						</div>
					{/if}
				</div>

				{#if resetOpen === u.id}
					<form
						method="POST"
						action="?/resetPassword"
						class="reset-row"
						use:enhance={() => {
							return async ({ update }) => {
								await update();
								resetOpen = null;
							};
						}}
					>
						<input type="hidden" name="id" value={u.id} />
						<input
							name="password"
							type="text"
							class="input"
							placeholder="New password (min 6)"
							autocomplete="off"
							minlength="6"
							required
						/>
						<button type="submit" class="btn btn-primary btn-sm">Set</button>
					</form>
				{/if}
			</div>
		{/each}
	</div>
</section>

<style>
	.banner {
		border-radius: 0.7rem;
		padding: 0.7rem 0.9rem;
		font-size: 0.88rem;
		margin-bottom: 1rem;
		border: 1px solid transparent;
	}
	.banner-bad {
		background: color-mix(in srgb, var(--color-bad) 12%, transparent);
		border-color: color-mix(in srgb, var(--color-bad) 35%, transparent);
		color: var(--color-bad);
	}
	.banner-good {
		background: color-mix(in srgb, var(--color-good) 12%, transparent);
		border-color: color-mix(in srgb, var(--color-good) 38%, transparent);
		color: var(--color-good);
	}
	.create-card {
		padding: 1.1rem;
		margin-bottom: 1.75rem;
	}
	.block-title {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-subtle);
		margin-bottom: 0.85rem;
	}
	.create-grid {
		display: grid;
		gap: 0.9rem;
	}
	@media (min-width: 520px) {
		.create-grid {
			grid-template-columns: 1fr 1fr;
		}
	}
	.hint {
		font-size: 0.75rem;
		margin: 0.6rem 0 0.9rem;
	}
	.block {
		margin-top: 0.5rem;
	}
	.stack {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.user {
		padding: 0.75rem 0.9rem;
	}
	.user-main {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.avatar {
		display: grid;
		place-items: center;
		width: 2.4rem;
		height: 2.4rem;
		border-radius: 999px;
		flex-shrink: 0;
		font-size: 0.78rem;
		font-weight: 700;
		background: var(--color-surface-2);
		color: var(--color-subtle);
		border: 1px solid var(--color-border);
	}
	.avatar-admin {
		background: color-mix(in srgb, var(--color-accent) 18%, var(--color-surface-2));
		color: var(--color-accent-bright);
		border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
	}
	.user-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}
	.user-name {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		word-break: break-all;
	}
	.admin-badge {
		text-transform: uppercase;
		letter-spacing: 0.03em;
		font-size: 0.62rem;
	}
	.user-date {
		font-size: 0.78rem;
	}
	.user-actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-shrink: 0;
	}
	.btn-sm {
		min-height: 2.2rem;
		padding: 0.4rem 0.7rem;
		font-size: 0.8rem;
		border-radius: 0.6rem;
	}
	.reset-row {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--color-border-soft);
	}
	.reset-row .input {
		flex: 1;
	}
</style>
