<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { jsonRequest, ClientApiError } from '$lib/client/json';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import {
		PLANS,
		STATUS_LABELS,
		addMonths,
		formatDay,
		isoDate,
		paymentAgenda,
		planLabel,
		type Coach,
		type CoachPlan
	} from '$lib/owner';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const today = isoDate(new Date());
	const usernamePattern = '[a-z0-9._]{3,30}';
	const agenda = $derived(paymentAgenda(data.coaches, today));

	let creating = $state(false);
	let notice = $state<{ kind: 'good' | 'bad'; text: string } | null>(null);
	let plan = $state<CoachPlan>('basic');
	let maxClients = $state<number | null>(10);
	let paidUntil = $state(addMonths(today, 1));

	function choosePlan(next: CoachPlan) {
		plan = next;
		maxClients = PLANS.find((item) => item.id === next)?.maxClients ?? null;
	}

	function clientsLabel(coach: Coach): string {
		return `${coach.activeClients} / ${coach.maxClients ?? '∞'}`;
	}

	function statusClass(coach: Coach): string {
		if (coach.status === 'active') return 'badge-good';
		if (coach.status === 'grace') return 'badge-accent';
		return 'badge-bad';
	}

	async function createCoach(event: SubmitEvent) {
		event.preventDefault();
		if (creating) return;
		const form = event.currentTarget as HTMLFormElement;
		const values = new FormData(form);
		creating = true;
		notice = null;
		try {
			const coach = await jsonRequest<Coach>('/api/owner/coaches', 'POST', {
				username: String(values.get('username') ?? '').trim(),
				password: String(values.get('password') ?? ''),
				plan,
				maxClients: plan === 'unlimited' ? null : maxClients,
				paidUntil
			});
			form.reset();
			choosePlan('basic');
			paidUntil = addMonths(today, 1);
			notice = { kind: 'good', text: `Se creó el entrenador ${coach.username}.` };
			await invalidateAll();
		} catch (error) {
			notice = {
				kind: 'bad',
				text:
					error instanceof ClientApiError ? error.message : 'No se pudo conectar con el servidor'
			};
		} finally {
			creating = false;
		}
	}
</script>

<svelte:head><title>Entrenadores · Gym Tracker</title></svelte:head>

<PageHeader title="Entrenadores" subtitle="Planes, clientes y pagos en efectivo">
	{#snippet action()}
		<a href={resolve('/admin')} class="btn btn-subtle btn-sm"
			><Icon name="users" size={15} /> Usuarios</a
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

{#if agenda.overdue.length || agenda.dueSoon.length}
	<section class="agenda">
		{#if agenda.overdue.length}
			<div>
				<h2 class="section-label">Vencidos</h2>
				{#each agenda.overdue as coach (coach.id)}
					<a class="ledger-row agenda-row" href={resolve('/admin/coaches/[id]', { id: coach.id })}>
						<span class="name">{coach.username}</span>
						<span class="badge {statusClass(coach)}">{STATUS_LABELS[coach.status]}</span>
						<span class="muted date">desde {formatDay(coach.paidUntil)}</span>
					</a>
				{/each}
			</div>
		{/if}
		{#if agenda.dueSoon.length}
			<div>
				<h2 class="section-label">Les toca pagar esta semana</h2>
				{#each agenda.dueSoon as coach (coach.id)}
					<a class="ledger-row agenda-row" href={resolve('/admin/coaches/[id]', { id: coach.id })}>
						<span class="name">{coach.username}</span>
						<span class="muted date">hasta {formatDay(coach.paidUntil)}</span>
					</a>
				{/each}
			</div>
		{/if}
	</section>
{/if}

<section class="block">
	<div class="section-heading">
		<h2 class="section-label">Todos los entrenadores</h2>
		<span class="muted data-value">{data.coaches.length}</span>
	</div>
	{#if data.coaches.length}
		<div class="coach-table" role="table" aria-label="Entrenadores">
			<div class="table-head" role="row">
				<span role="columnheader">Entrenador</span><span role="columnheader">Plan</span><span
					role="columnheader">Clientes</span
				><span role="columnheader">Pagado hasta</span><span role="columnheader">Estado</span>
			</div>
			{#each data.coaches as coach (coach.id)}
				<a class="coach" role="row" href={resolve('/admin/coaches/[id]', { id: coach.id })}>
					<span class="name">{coach.username}</span>
					<span class="subtle">{planLabel(coach.plan)}</span>
					<span class="data-value">{clientsLabel(coach)}</span>
					<span class="subtle">{formatDay(coach.paidUntil)}</span>
					<span><span class="badge {statusClass(coach)}">{STATUS_LABELS[coach.status]}</span></span>
				</a>
			{/each}
		</div>
	{:else}
		<EmptyState
			title="Aún no hay entrenadores"
			message="Crea el primero con el formulario de abajo."
		/>
	{/if}
</section>

<section class="create">
	<h2 class="section-label">Nuevo entrenador</h2>
	<form onsubmit={createCoach}>
		<div class="field-grid">
			<div>
				<label class="label" for="coach-username">Usuario</label>
				<input
					id="coach-username"
					name="username"
					type="text"
					class="input"
					placeholder="p. ej. coach.maria"
					autocapitalize="none"
					autocorrect="off"
					spellcheck="false"
					pattern={usernamePattern}
					title="Minúsculas, números, puntos y guiones bajos (3–30 caracteres)"
					required
				/>
			</div>
			<div>
				<label class="label" for="coach-password">Contraseña</label>
				<input
					id="coach-password"
					name="password"
					type="password"
					class="input"
					placeholder="al menos 6 caracteres"
					autocomplete="off"
					minlength="6"
					required
				/>
			</div>
			<div>
				<label class="label" for="coach-plan">Plan</label>
				<select
					id="coach-plan"
					class="input"
					value={plan}
					onchange={(event) => choosePlan(event.currentTarget.value as CoachPlan)}
				>
					{#each PLANS as option (option.id)}
						<option value={option.id}>{option.label}</option>
					{/each}
				</select>
			</div>
			{#if plan !== 'unlimited'}
				<div>
					<label class="label" for="coach-max">Máximo de clientes</label>
					<input
						id="coach-max"
						type="number"
						class="input"
						min="1"
						max="1000"
						step="1"
						bind:value={maxClients}
						required
					/>
				</div>
			{/if}
			<div>
				<label class="label" for="coach-paid">Pagado hasta</label>
				<input id="coach-paid" type="date" class="input" bind:value={paidUntil} required />
			</div>
		</div>
		<p class="hint muted">
			Para un piloto gratis, pon la fecha en que termina. Los pagos se registran en la ficha del
			entrenador.
		</p>
		<button type="submit" class="btn btn-primary" disabled={creating}>
			{#if creating}Creando…{:else}<Icon name="check" size={16} /> Crear entrenador{/if}
		</button>
	</form>
</section>

<style>
	.banner {
		border-radius: var(--radius-control);
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
	.btn-sm {
		min-height: 2.2rem;
		padding: 0.4rem 0.7rem;
		font-size: 0.8rem;
	}
	.agenda {
		display: grid;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}
	@media (min-width: 720px) {
		.agenda {
			grid-template-columns: 1fr 1fr;
		}
	}
	.agenda .section-label {
		margin-bottom: 0.5rem;
	}
	.agenda-row {
		color: inherit;
		text-decoration: none;
	}
	.name {
		font-weight: 600;
		word-break: break-all;
	}
	.date {
		margin-left: auto;
		font-size: 0.82rem;
	}
	.section-heading {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}
	.coach-table {
		border-top: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
	}
	.table-head,
	.coach {
		display: grid;
		grid-template-columns: minmax(8rem, 1.4fr) 0.7fr 0.6fr 0.9fr auto;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 0;
	}
	.table-head {
		color: var(--color-muted);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.09em;
		text-transform: uppercase;
		border-bottom: 1px solid var(--color-border);
	}
	.coach {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px solid var(--color-border-soft);
	}
	.coach:last-child {
		border-bottom: 0;
	}
	@media (hover: hover) {
		.coach:hover .name,
		.agenda-row:hover .name {
			color: var(--color-accent-bright);
		}
	}
	.create {
		margin-top: 2.5rem;
		padding: 1.25rem 0;
		border-top: 1px solid var(--color-border);
	}
	.create .section-label {
		margin-bottom: 1rem;
	}
	.hint {
		font-size: 0.75rem;
		margin: 0.75rem 0 1rem;
	}
	@media (max-width: 719px) {
		.table-head {
			display: none;
		}
		.coach {
			grid-template-columns: 1fr auto;
			gap: 0.25rem 0.75rem;
		}
		.coach > :nth-child(2),
		.coach > :nth-child(3),
		.coach > :nth-child(4) {
			grid-column: 1;
			font-size: 0.82rem;
		}
		.coach > :nth-child(5) {
			grid-column: 2;
			grid-row: 1;
		}
	}
</style>
