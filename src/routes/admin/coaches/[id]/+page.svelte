<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { jsonRequest, ClientApiError } from '$lib/client/json';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import {
		PLANS,
		STATUS_LABELS,
		formatDay,
		formatMoney,
		isoDate,
		paymentPeriod,
		type Coach,
		type CoachPlan,
		type Payment
	} from '$lib/owner';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const coach = $derived(data.coach);
	const today = isoDate(new Date());

	let notice = $state<{ kind: 'good' | 'bad'; text: string } | null>(null);
	let saving = $state(false);
	let paying = $state(false);

	// Edit form; reset from the server copy whenever it changes.
	let plan = $state<CoachPlan>('basic');
	let maxClients = $state<number | null>(null);
	let paidUntil = $state('');
	let suspended = $state(false);
	$effect(() => {
		plan = data.coach.plan ?? 'basic';
		maxClients = data.coach.maxClients;
		paidUntil = data.coach.paidUntil ?? today;
		suspended = data.coach.suspended;
	});

	let amount = $state<number | null>(null);
	let months = $state(1);
	let paidOn = $state(today);
	let note = $state('');
	const preview = $derived(paymentPeriod(coach.paidUntil, paidOn || today, months || 1));

	function choosePlan(next: CoachPlan) {
		plan = next;
		maxClients = PLANS.find((item) => item.id === next)?.maxClients ?? null;
	}

	function failure(error: unknown) {
		notice = {
			kind: 'bad',
			text: error instanceof ClientApiError ? error.message : 'No se pudo conectar con el servidor'
		};
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;
		saving = true;
		notice = null;
		try {
			await jsonRequest<Coach>(`/api/owner/coaches/${coach.id}`, 'PUT', {
				plan,
				maxClients: plan === 'unlimited' ? null : maxClients,
				paidUntil,
				suspended
			});
			notice = { kind: 'good', text: 'Cambios guardados.' };
			await invalidateAll();
		} catch (error) {
			failure(error);
		} finally {
			saving = false;
		}
	}

	async function recordPayment(event: SubmitEvent) {
		event.preventDefault();
		if (paying) return;
		paying = true;
		notice = null;
		try {
			const payment = await jsonRequest<Payment>(
				`/api/owner/coaches/${coach.id}/payments`,
				'POST',
				{
					amount,
					months,
					paidOn,
					note: note.trim() || null
				}
			);
			await goto(resolve('/admin/payments/[id]', { id: payment.id }));
		} catch (error) {
			failure(error);
		} finally {
			paying = false;
		}
	}
</script>

<svelte:head><title>{coach.username} · Entrenadores</title></svelte:head>

<PageHeader title={coach.username} subtitle="Entrenador">
	{#snippet action()}
		<a href={resolve('/admin/coaches')} class="btn btn-subtle btn-sm"
			><Icon name="back" size={15} /> Entrenadores</a
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

<dl class="facts ledger-section">
	<div>
		<dt class="section-label">Estado</dt>
		<dd>{STATUS_LABELS[coach.status]}</dd>
	</div>
	<div>
		<dt class="section-label">Pagado hasta</dt>
		<dd>{formatDay(coach.paidUntil)}</dd>
	</div>
	<div>
		<dt class="section-label">Clientes</dt>
		<dd class="data-value">{coach.activeClients} / {coach.maxClients ?? '∞'}</dd>
	</div>
</dl>
{#if coach.status === 'grace'}
	<p class="muted explain">
		El pago venció. Tiene 7 días de gracia antes de pasar a solo lectura junto con sus clientes.
	</p>
{:else if coach.status === 'readonly' || coach.status === 'suspended'}
	<p class="muted explain">
		El entrenador y sus clientes pueden entrar y ver sus datos, pero no guardar cambios. No se borra
		nada.
	</p>
{/if}

<section class="panel">
	<h2 class="section-label">Registrar pago</h2>
	<form onsubmit={recordPayment}>
		<div class="field-grid">
			<div>
				<label class="label" for="pay-amount">Monto</label>
				<input
					id="pay-amount"
					type="number"
					class="input"
					min="0.01"
					step="0.01"
					inputmode="decimal"
					bind:value={amount}
					required
				/>
			</div>
			<div>
				<label class="label" for="pay-months">Meses</label>
				<select id="pay-months" class="input" bind:value={months}>
					{#each Array.from({ length: 12 }, (_, index) => index + 1) as count (count)}
						<option value={count}>{count === 1 ? '1 mes' : `${count} meses`}</option>
					{/each}
				</select>
			</div>
			<div>
				<label class="label" for="pay-date">Fecha del pago</label>
				<input id="pay-date" type="date" class="input" bind:value={paidOn} required />
			</div>
		</div>
		<div class="note-field">
			<label class="label" for="pay-note">Nota (opcional)</label>
			<input id="pay-note" type="text" class="input" maxlength="500" bind:value={note} />
		</div>
		<p class="hint muted">
			Cubre del {formatDay(preview.start)} al {formatDay(preview.end)}. Quedará pagado hasta el
			<strong>{formatDay(preview.paidUntil)}</strong>.
		</p>
		<button type="submit" class="btn btn-primary" disabled={paying}>
			{#if paying}Guardando…{:else}<Icon name="check" size={16} /> Registrar y ver recibo{/if}
		</button>
	</form>
</section>

<section class="panel">
	<h2 class="section-label">Pagos</h2>
	{#if data.payments.length}
		<div class="ledger-section">
			{#each data.payments as payment (payment.id)}
				<a class="ledger-row payment" href={resolve('/admin/payments/[id]', { id: payment.id })}>
					<span class="data-value amount">{formatMoney(payment.amount)}</span>
					<span class="subtle">
						{formatDay(payment.periodStart)} – {formatDay(payment.periodEnd)}
					</span>
					<span class="muted paid-on">{formatDay(payment.paidOn)}</span>
				</a>
			{/each}
		</div>
	{:else}
		<p class="muted">Todavía no hay pagos registrados.</p>
	{/if}
</section>

<section class="panel">
	<h2 class="section-label">Plan y acceso</h2>
	<form onsubmit={save}>
		<div class="field-grid">
			<div>
				<label class="label" for="edit-plan">Plan</label>
				<select
					id="edit-plan"
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
					<label class="label" for="edit-max">Máximo de clientes</label>
					<input
						id="edit-max"
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
				<label class="label" for="edit-paid">Pagado hasta</label>
				<input id="edit-paid" type="date" class="input" bind:value={paidUntil} required />
			</div>
		</div>
		<label class="check">
			<input type="checkbox" bind:checked={suspended} />
			<span>Suspendido: el entrenador y sus clientes quedan en solo lectura</span>
		</label>
		<p class="hint muted">
			Cambia «Pagado hasta» solo para corregir un error; los pagos normales lo amplían solos.
		</p>
		<button type="submit" class="btn btn-subtle" disabled={saving}>
			{#if saving}Guardando…{:else}Guardar cambios{/if}
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
	.facts {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		margin: 0;
		padding: 1rem 0;
		background: none;
	}
	.facts dd {
		margin: 0.35rem 0 0;
		font-weight: 600;
	}
	.explain {
		margin-top: 0.75rem;
		font-size: 0.85rem;
	}
	.panel {
		margin-top: 2.25rem;
	}
	.panel > .section-label {
		margin-bottom: 1rem;
	}
	.note-field {
		margin-top: 1rem;
	}
	.hint {
		font-size: 0.8rem;
		margin: 0.75rem 0 1rem;
	}
	.hint strong {
		color: var(--color-text);
	}
	.payment {
		color: inherit;
		text-decoration: none;
	}
	.amount {
		min-width: 6rem;
		font-weight: 600;
	}
	.paid-on {
		margin-left: auto;
		font-size: 0.8rem;
	}
	.check {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-top: 1rem;
		font-size: 0.9rem;
	}
	.check input {
		width: 1.1rem;
		height: 1.1rem;
		accent-color: var(--color-accent);
	}
	@media (max-width: 519px) {
		.payment {
			flex-wrap: wrap;
			gap: 0.25rem 1rem;
		}
	}
</style>
