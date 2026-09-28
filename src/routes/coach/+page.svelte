<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { jsonRequest, ClientApiError } from '$lib/client/json';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import {
		INACTIVE_DAYS,
		clientActivity,
		lastSessionLabel,
		sortClients,
		type ClientSummary
	} from '$lib/coach';
	import { GRACE_DAYS, addDays, formatDay, planLabel } from '$lib/owner';
	import { todayYmd } from '$lib/utils/progression';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const today = todayYmd();
	const usernamePattern = '[a-z0-9._]{3,30}';
	const coach = $derived(data.roster.coach);
	const active = $derived(
		sortClients(
			data.roster.clients.filter((client) => !client.disabled),
			today
		)
	);
	const disabled = $derived(data.roster.clients.filter((client) => client.disabled));
	const full = $derived(coach.maxClients !== null && coach.activeClients >= coach.maxClients);
	const inactiveCount = $derived(
		active.filter((client) => clientActivity(client, today).inactive).length
	);

	let showCreate = $state(false);
	let creating = $state(false);
	let busyId = $state<string | null>(null);
	let notice = $state<{ kind: 'good' | 'bad'; text: string } | null>(null);

	function failure(error: unknown) {
		notice = {
			kind: 'bad',
			text: error instanceof ClientApiError ? error.message : 'No se pudo conectar con el servidor'
		};
	}

	async function createClient(event: SubmitEvent) {
		event.preventDefault();
		if (creating) return;
		const form = event.currentTarget as HTMLFormElement;
		const values = new FormData(form);
		creating = true;
		notice = null;
		try {
			const client = await jsonRequest<ClientSummary>('/api/coach/clients', 'POST', {
				username: String(values.get('username') ?? '').trim(),
				password: String(values.get('password') ?? '')
			});
			form.reset();
			showCreate = false;
			notice = {
				kind: 'good',
				text: `Se creó ${client.username}. Dale su usuario y contraseña para que entre.`
			};
			await invalidateAll();
		} catch (error) {
			failure(error);
		} finally {
			creating = false;
		}
	}

	async function enable(client: ClientSummary) {
		busyId = client.id;
		notice = null;
		try {
			await jsonRequest(`/api/coach/clients/${client.id}/status`, 'PUT', { disabled: false });
			notice = { kind: 'good', text: `${client.username} vuelve a estar activo.` };
			await invalidateAll();
		} catch (error) {
			failure(error);
		} finally {
			busyId = null;
		}
	}
</script>

<svelte:head><title>Mis clientes · Gym Tracker</title></svelte:head>

<PageHeader
	title="Mis clientes"
	subtitle={`${coach.activeClients} de ${coach.maxClients ?? '∞'} clientes activos · Plan ${planLabel(coach.plan)}`}
>
	{#snippet action()}
		<button
			type="button"
			class="btn btn-primary"
			disabled={full}
			onclick={() => (showCreate = !showCreate)}
		>
			<Icon name="plus" size={16} stroke={2.5} /> Nuevo cliente
		</button>
	{/snippet}
</PageHeader>

{#if coach.status === 'grace' && coach.paidUntil}
	<p class="banner banner-warn">
		Tu pago venció el {formatDay(coach.paidUntil)}. Hasta el
		{formatDay(addDays(coach.paidUntil, GRACE_DAYS))} todo sigue funcionando; después tú y tus clientes
		quedaréis en solo lectura hasta que pagues.
	</p>
{/if}
{#if full}
	<p class="banner banner-warn">
		Llegaste al límite de tu plan. Desactiva a un cliente que ya no entrene contigo o pide al
		administrador que te amplíe el plan.
	</p>
{/if}
{#if notice}
	<p
		class="banner"
		class:banner-good={notice.kind === 'good'}
		class:banner-bad={notice.kind === 'bad'}
	>
		{notice.text}
	</p>
{/if}

{#if showCreate}
	<section class="create">
		<h2 class="section-label">Nuevo cliente</h2>
		<form onsubmit={createClient}>
			<div class="field-grid">
				<div>
					<label class="label" for="client-username">Usuario</label>
					<input
						id="client-username"
						name="username"
						type="text"
						class="input"
						placeholder="p. ej. juan.perez"
						autocapitalize="none"
						autocorrect="off"
						spellcheck="false"
						pattern={usernamePattern}
						title="Minúsculas, números, puntos y guiones bajos (3–30 caracteres)"
						required
					/>
				</div>
				<div>
					<label class="label" for="client-password">Contraseña</label>
					<input
						id="client-password"
						name="password"
						type="text"
						class="input"
						placeholder="al menos 6 caracteres"
						autocomplete="off"
						minlength="6"
						required
					/>
				</div>
			</div>
			<p class="hint muted">
				El cliente entra con estos datos en la web o en la app. Luego puedes cambiarle la
				contraseña.
			</p>
			<div class="actions">
				<button type="submit" class="btn btn-primary" disabled={creating}>
					{#if creating}Creando…{:else}<Icon name="check" size={16} /> Crear cliente{/if}
				</button>
				<button type="button" class="btn btn-ghost" onclick={() => (showCreate = false)}
					>Cancelar</button
				>
			</div>
		</form>
	</section>
{/if}

{#if active.length === 0}
	<EmptyState
		icon="users"
		title="Aún no tienes clientes"
		message="Crea una cuenta para cada cliente. Verás su progreso y podrás anotarle las sesiones."
	/>
{:else}
	<section class="block">
		<div class="section-heading">
			<h2 class="section-label">Activos</h2>
			{#if inactiveCount}
				<span class="badge badge-bad">{inactiveCount} sin entrenar {INACTIVE_DAYS}+ días</span>
			{/if}
		</div>
		<div class="ledger-section list">
			{#each active as client (client.id)}
				{@const activity = clientActivity(client, today)}
				<a class="ledger-row client" href={resolve('/coach/clients/[id]', { id: client.id })}>
					<div class="client-main">
						<span class="name">{client.username}</span>
						<span class="muted small" class:alert={activity.inactive}
							>{lastSessionLabel(activity)}</span
						>
					</div>
					<div class="week">
						<span class="data-value">{activity.sessionsThisWeek}</span>
						<span class="muted small">esta semana</span>
					</div>
					{#if activity.inactive}
						<span class="badge badge-bad">Sin entrenar</span>
					{/if}
					<Icon name="chevron" size={16} />
				</a>
			{/each}
		</div>
	</section>
{/if}

{#if disabled.length}
	<section class="block">
		<h2 class="section-label">Desactivados</h2>
		<p class="muted hint">No pueden entrar ni cuentan para tu límite. Sus datos se conservan.</p>
		<div class="ledger-section list">
			{#each disabled as client (client.id)}
				<div class="ledger-row client">
					<a class="name link" href={resolve('/coach/clients/[id]', { id: client.id })}
						>{client.username}</a
					>
					<button
						type="button"
						class="btn btn-subtle btn-sm"
						disabled={full || busyId === client.id}
						onclick={() => enable(client)}
					>
						Reactivar
					</button>
				</div>
			{/each}
		</div>
	</section>
{/if}

<style>
	.banner {
		border-radius: var(--radius-control);
		padding: 0.7rem 0.9rem;
		font-size: 0.88rem;
		margin-bottom: 1rem;
		border: 1px solid transparent;
	}
	.banner-warn {
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
		border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
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
	.create {
		margin-bottom: 2rem;
		padding: 1.25rem 0;
		border-top: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
	}
	.create .section-label {
		margin-bottom: 1rem;
	}
	.hint {
		font-size: 0.8rem;
		margin: 0.6rem 0 1rem;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
	}
	.block {
		margin-bottom: 2rem;
	}
	.section-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.6rem;
	}
	.block > .section-label {
		margin-bottom: 0.4rem;
	}
	.list {
		background: none;
	}
	.client {
		color: inherit;
		text-decoration: none;
	}
	.client-main {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}
	.name {
		font-weight: 600;
		word-break: break-all;
	}
	.link {
		flex: 1;
		color: inherit;
		text-decoration: none;
	}
	.small {
		font-size: 0.78rem;
	}
	.alert {
		color: var(--color-bad);
	}
	.week {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}
	.btn-sm {
		min-height: 2.2rem;
		padding: 0.4rem 0.7rem;
		font-size: 0.8rem;
	}
	@media (hover: hover) {
		a.client:hover .name,
		.link:hover {
			color: var(--color-accent-bright);
		}
	}
	@media (max-width: 519px) {
		.client .badge {
			display: none;
		}
	}
</style>
