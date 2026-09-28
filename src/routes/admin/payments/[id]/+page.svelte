<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import { formatDay, formatMoney } from '$lib/owner';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const payment = $derived(data.payment);
	// Short and readable enough to say out loud; the full id stays unique.
	const number = $derived(payment.id.slice(-6).toUpperCase());
	const monthsLabel = $derived(payment.months === 1 ? '1 mes' : `${payment.months} meses`);
	let copied = $state(false);

	const summary = $derived(
		[
			`Recibo nº ${number} · Gym Tracker`,
			`Entrenador: ${payment.coachUsername}`,
			`Monto: ${formatMoney(payment.amount)}`,
			`Periodo: ${formatDay(payment.periodStart)} – ${formatDay(payment.periodEnd)} (${monthsLabel})`,
			`Pagado el ${formatDay(payment.paidOn)}`,
			payment.note ? `Nota: ${payment.note}` : ''
		]
			.filter(Boolean)
			.join('\n')
	);

	async function share() {
		if (navigator.share) {
			await navigator.share({ title: `Recibo nº ${number}`, text: summary }).catch(() => undefined);
			return;
		}
		await navigator.clipboard.writeText(summary);
		copied = true;
	}
</script>

<svelte:head><title>Recibo {number} · Gym Tracker</title></svelte:head>

<div class="actions no-print">
	<a href={resolve('/admin/coaches/[id]', { id: payment.coachId })} class="btn btn-subtle btn-sm"
		><Icon name="back" size={15} /> {payment.coachUsername}</a
	>
	<span class="spacer"></span>
	<button type="button" class="btn btn-subtle btn-sm" onclick={share}>
		<Icon name="copy" size={15} />
		{copied ? 'Copiado' : 'Compartir'}
	</button>
	<button type="button" class="btn btn-primary btn-sm" onclick={() => window.print()}>
		<Icon name="clipboard" size={15} /> Imprimir
	</button>
</div>

<article class="receipt">
	<header>
		<p class="brand">GYM TRACKER</p>
		<h1>Recibo de pago</h1>
		<p class="number data-value">Nº {number}</p>
	</header>
	<dl>
		<div>
			<dt>Entrenador</dt>
			<dd>{payment.coachUsername}</dd>
		</div>
		<div>
			<dt>Monto recibido</dt>
			<dd class="data-value total">{formatMoney(payment.amount)}</dd>
		</div>
		<div>
			<dt>Periodo cubierto</dt>
			<dd>{formatDay(payment.periodStart)} – {formatDay(payment.periodEnd)} ({monthsLabel})</dd>
		</div>
		<div>
			<dt>Fecha del pago</dt>
			<dd>{formatDay(payment.paidOn)}</dd>
		</div>
		{#if payment.note}
			<div>
				<dt>Nota</dt>
				<dd>{payment.note}</dd>
			</div>
		{/if}
		<div>
			<dt>Recibido por</dt>
			<dd>{page.data.user?.username ?? ''}</dd>
		</div>
	</dl>
	<p class="foot">Pago en efectivo. Gracias.</p>
</article>

<style>
	.actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}
	.spacer {
		flex: 1;
	}
	.btn-sm {
		min-height: 2.2rem;
		padding: 0.4rem 0.7rem;
		font-size: 0.8rem;
	}
	.receipt {
		max-width: 32rem;
		margin: 0 auto;
		padding: 1.75rem 1.5rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-overlay);
		background: var(--color-surface);
	}
	header {
		padding-bottom: 1rem;
		margin-bottom: 1rem;
		border-bottom: 1px dashed var(--color-border);
		text-align: center;
	}
	.brand {
		color: var(--color-accent-bright);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.2em;
	}
	h1 {
		margin: 0.35rem 0 0.25rem;
		font-size: 1.5rem;
	}
	.number {
		color: var(--color-muted);
	}
	dl {
		display: grid;
		gap: 0.85rem;
		margin: 0;
	}
	dt {
		color: var(--color-muted);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	dd {
		margin: 0.2rem 0 0;
	}
	.total {
		font-size: 1.4rem;
		font-weight: 700;
	}
	.foot {
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px dashed var(--color-border);
		color: var(--color-muted);
		font-size: 0.85rem;
		text-align: center;
	}
	@media print {
		:global(.desktop-rail),
		:global(.topbar),
		:global(nav),
		.no-print {
			display: none !important;
		}
		:global(body) {
			background: #fff;
		}
		.receipt {
			border-color: #999;
			background: #fff;
			color: #000;
		}
		.brand,
		.number,
		dt,
		.foot {
			color: #444;
		}
	}
</style>
