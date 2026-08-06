<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { jsonRequest, ClientApiError } from '$lib/client/json';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let creating = $state(false);
	let deletingId = $state<string | null>(null);
	let resettingId = $state<string | null>(null);
	let notice = $state<{ kind: 'good' | 'bad'; text: string } | null>(null);
	const usernamePattern = '[a-z0-9._]{3,30}';
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

	function message(error: unknown): string {
		return error instanceof ClientApiError ? error.message : 'Could not reach the API';
	}

	async function createUser(event: SubmitEvent) {
		event.preventDefault();
		if (creating) return;
		const form = event.currentTarget as HTMLFormElement;
		const values = new FormData(form);
		creating = true;
		notice = null;
		try {
			const username = String(values.get('username') ?? '').trim();
			await jsonRequest('/api/admin/users', 'POST', {
				username,
				password: String(values.get('password') ?? '')
			});
			form.reset();
			notice = { kind: 'good', text: `Created ${username.toLowerCase()}.` };
			await invalidateAll();
		} catch (error) {
			notice = { kind: 'bad', text: message(error) };
		} finally {
			creating = false;
		}
	}

	async function deleteUser(id: string, username: string) {
		if (deletingId || !confirm(`Delete user "${username}"? This cannot be undone.`)) return;
		deletingId = id;
		notice = null;
		try {
			await jsonRequest(`/api/admin/users/${id}`, 'DELETE');
			notice = { kind: 'good', text: 'User deleted.' };
			await invalidateAll();
		} catch (error) {
			notice = { kind: 'bad', text: message(error) };
		} finally {
			deletingId = null;
		}
	}

	async function resetPassword(event: SubmitEvent, id: string) {
		event.preventDefault();
		if (resettingId) return;
		const form = event.currentTarget as HTMLFormElement;
		const values = new FormData(form);
		resettingId = id;
		notice = null;
		try {
			await jsonRequest(`/api/admin/users/${id}/password`, 'PUT', {
				password: String(values.get('password') ?? '')
			});
			form.reset();
			resetOpen = null;
			notice = { kind: 'good', text: 'Password updated.' };
		} catch (error) {
			notice = { kind: 'bad', text: message(error) };
		} finally {
			resettingId = null;
		}
	}
</script>

<svelte:head><title>Users · Gym Tracker</title></svelte:head>

<PageHeader title="Users" subtitle="Create and manage who can sign in">
	{#snippet action()}
		<a href="/admin/audit" class="btn btn-subtle btn-sm"><Icon name="trending" size={15} /> Audit</a
		>
	{/snippet}
</PageHeader>

{#if notice}
	<p
		class="banner"
		class:banner-good={notice.kind === 'good'}
		class:banner-bad={notice.kind === 'bad'}
	>
		{notice.text}
	</p>
{/if}

<section class="card create-card">
	<h2 class="block-title"><Icon name="plus" size={16} /> New user</h2>
	<form onsubmit={createUser}>
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
					pattern={usernamePattern}
					title="Lowercase letters, numbers, dots and underscores (3–30 chars)"
					required
				/>
			</div>
			<div>
				<label class="label" for="new-password">Password</label>
				<input
					id="new-password"
					name="password"
					type="password"
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
							<button
								type="button"
								class="btn btn-danger btn-sm"
								aria-label="Delete user"
								disabled={deletingId === u.id}
								onclick={() => void deleteUser(u.id, u.username)}
							>
								<Icon name="trash" size={14} />
							</button>
						</div>
					{/if}
				</div>

				{#if resetOpen === u.id}
					<form class="reset-row" onsubmit={(event) => resetPassword(event, u.id)}>
						<input
							name="password"
							type="password"
							class="input"
							placeholder="New password (min 6)"
							autocomplete="off"
							minlength="6"
							required
						/>
						<button type="submit" class="btn btn-primary btn-sm" disabled={resettingId === u.id}
							>Set</button
						>
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
