<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { jsonRequest, ClientApiError } from '$lib/client/json';
	import Icon from '$lib/components/Icon.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import ProgressOverview from '$lib/components/ProgressOverview.svelte';
	import SessionHistory from '$lib/components/SessionHistory.svelte';
	import MeasurementsPanel from '$lib/components/MeasurementsPanel.svelte';
	import { clientActivity, lastSessionLabel } from '$lib/coach';
	import { lengthUnitOf, offlineData, weightUnitOf } from '$lib/offline/store';
	import {
		buildExerciseProgress,
		buildWeeklyRecap,
		groupProgressByRoutine,
		todayYmd
	} from '$lib/utils/progression';
	import { WEEKDAYS, WEEKDAY_LABELS } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const TABS = [
		{ id: 'progress', label: 'Progreso' },
		{ id: 'history', label: 'Historial' },
		{ id: 'routines', label: 'Rutinas' },
		{ id: 'body', label: 'Cuerpo' },
		{ id: 'account', label: 'Cuenta' }
	] as const;
	type Tab = (typeof TABS)[number]['id'];

	const client = $derived(data.detail.client);
	const snapshot = $derived(data.detail.snapshot);
	// Numbers use the coach's own units.
	const unit = $derived(weightUnitOf($offlineData, page.data.user));
	const lengthUnit = $derived(lengthUnitOf($offlineData, page.data.user));
	const activity = $derived(clientActivity(client, todayYmd()));
	const progress = $derived(buildExerciseProgress(snapshot.sessions, snapshot.exercises));
	const groups = $derived(groupProgressByRoutine(progress, snapshot.routines));
	const recap = $derived(buildWeeklyRecap(progress));
	const untracked = $derived(
		progress.filter((item) => item.weeks.length === 0).map((item) => item.exercise)
	);
	const routineById = $derived(new Map(snapshot.routines.map((item) => [item.id, item])));
	const exerciseNames = $derived(new Map(snapshot.exercises.map((item) => [item.id, item.name])));

	const requested = $derived(page.url.searchParams.get('tab'));
	const tab = $derived<Tab>(
		TABS.some((item) => item.id === requested) ? (requested as Tab) : 'progress'
	);

	function selectTab(next: Tab) {
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve() plus a query string
		void goto(`${resolve('/coach/clients/[id]', { id: client.id })}?tab=${next}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}

	let notice = $state<{ kind: 'good' | 'bad'; text: string } | null>(null);
	let savingPassword = $state(false);
	let togglingStatus = $state(false);
	let confirmDisable = $state(false);

	function failure(error: unknown) {
		notice = {
			kind: 'bad',
			text: error instanceof ClientApiError ? error.message : 'No se pudo conectar con el servidor'
		};
	}

	async function resetPassword(event: SubmitEvent) {
		event.preventDefault();
		if (savingPassword) return;
		const form = event.currentTarget as HTMLFormElement;
		savingPassword = true;
		notice = null;
		try {
			await jsonRequest(`/api/coach/clients/${client.id}/password`, 'PUT', {
				password: String(new FormData(form).get('password') ?? '')
			});
			form.reset();
			notice = {
				kind: 'good',
				text: 'Contraseña cambiada. Su sesión se cerró en todos sus dispositivos.'
			};
		} catch (error) {
			failure(error);
		} finally {
			savingPassword = false;
		}
	}

	async function setDisabled(disabled: boolean) {
		togglingStatus = true;
		notice = null;
		try {
			await jsonRequest(`/api/coach/clients/${client.id}/status`, 'PUT', { disabled });
			notice = {
				kind: 'good',
				text: disabled ? 'Cliente desactivado.' : 'Cliente reactivado.'
			};
			await invalidateAll();
		} catch (error) {
			failure(error);
		} finally {
			togglingStatus = false;
			confirmDisable = false;
		}
	}
</script>

<svelte:head><title>{client.username} · Mis clientes</title></svelte:head>

<a href={resolve('/coach')} class="back"><Icon name="back" size={16} /> Mis clientes</a>

<header class="head">
	<h1 class="page-title">{client.username}</h1>
	<p class="muted meta">
		{#if client.disabled}
			<span class="badge badge-bad">Desactivado</span>
		{/if}
		<span class:alert={activity.inactive}>{lastSessionLabel(activity)}</span>
		<span>·</span>
		<span
			>{activity.sessionsThisWeek}
			{activity.sessionsThisWeek === 1 ? 'sesión' : 'sesiones'} esta semana</span
		>
	</p>
</header>

<div class="tabs" role="tablist" aria-label="Secciones del cliente">
	{#each TABS as item (item.id)}
		<button
			type="button"
			role="tab"
			class="tab"
			class:active={tab === item.id}
			aria-selected={tab === item.id}
			onclick={() => selectTab(item.id)}
		>
			{item.label}
		</button>
	{/each}
</div>

{#if notice}
	<p
		class="banner"
		class:banner-good={notice.kind === 'good'}
		class:banner-bad={notice.kind === 'bad'}
	>
		{notice.text}
	</p>
{/if}

{#if tab === 'progress'}
	<ProgressOverview
		{groups}
		{recap}
		{untracked}
		{unit}
		exerciseHref={(exerciseId) =>
			resolve('/coach/clients/[id]/progress/[exerciseId]', { id: client.id, exerciseId })}
		emptyMessage="Todavía no hay sesiones registradas. Cuando entrene, aquí verás cómo progresa en cada ejercicio."
		untrackedHint="Aún sin sesiones"
	/>
{:else if tab === 'history'}
	<SessionHistory
		sessions={snapshot.sessions}
		exercises={snapshot.exercises}
		routines={snapshot.routines}
		{unit}
	/>
{:else if tab === 'routines'}
	<section class="block">
		<h2 class="section-label">Calendario</h2>
		<div class="ledger-section plain">
			{#each WEEKDAYS as day (day)}
				{@const routine = snapshot.schedule[day] ? routineById.get(snapshot.schedule[day]!) : null}
				<div class="ledger-row">
					<span class="day">{WEEKDAY_LABELS[day]}</span>
					{#if routine}
						<span class="dot" style="background:{routine.color}"></span>
						<span>{routine.name}</span>
					{:else}
						<span class="muted">Descanso</span>
					{/if}
				</div>
			{/each}
		</div>
	</section>
	<section class="block">
		<h2 class="section-label">Rutinas</h2>
		{#if snapshot.routines.length === 0}
			<p class="muted">No tiene rutinas. Puedes anotarle sesiones libres.</p>
		{:else}
			<div class="ledger-section plain">
				{#each snapshot.routines as routine (routine.id)}
					<details class="routine">
						<summary>
							<span class="dot" style="background:{routine.color}"></span>
							<strong>{routine.name}</strong>
							<span class="muted small">{routine.exercises.length} ejercicios</span>
						</summary>
						<ol>
							{#each routine.exercises as item, index (index)}
								<li>
									{exerciseNames.get(item.exerciseId) ?? 'Ejercicio borrado'}
									<span class="muted">· {item.sets} {item.sets === 1 ? 'serie' : 'series'}</span>
								</li>
							{/each}
						</ol>
					</details>
				{/each}
			</div>
		{/if}
		<p class="muted small note">Las rutinas y el calendario los edita el cliente.</p>
	</section>
{:else if tab === 'body'}
	<MeasurementsPanel
		measurements={snapshot.measurements ?? []}
		weightUnit={unit}
		{lengthUnit}
		readOnly
		canEdit={() => false}
		onSave={async () => {}}
		onDelete={async () => {}}
	/>
{:else}
	<section class="block">
		<h2 class="section-label">Cambiar contraseña</h2>
		<form class="password" onsubmit={resetPassword}>
			<input
				name="password"
				type="text"
				class="input"
				placeholder="Nueva contraseña (mín. 6)"
				autocomplete="off"
				minlength="6"
				required
			/>
			<button type="submit" class="btn btn-primary" disabled={savingPassword}>Guardar</button>
		</form>
	</section>
	<section class="block">
		<h2 class="section-label">Acceso</h2>
		{#if client.disabled}
			<p class="muted">
				Está desactivado: no puede entrar ni cuenta para tu límite. Sus datos se conservan.
			</p>
			<button
				type="button"
				class="btn btn-subtle"
				disabled={togglingStatus}
				onclick={() => setDisabled(false)}>Reactivar</button
			>
		{:else}
			<p class="muted">
				Si deja de entrenar contigo, desactívalo: no podrá entrar ni contará para tu límite, y sus
				datos se conservan por si vuelve.
			</p>
			<button type="button" class="btn btn-danger" onclick={() => (confirmDisable = true)}
				>Desactivar</button
			>
		{/if}
	</section>
{/if}

<ConfirmDialog
	open={confirmDisable}
	title="¿Desactivar a {client.username}?"
	message="Se cerrará su sesión y no podrá entrar hasta que lo reactives. No se borra nada."
	confirmLabel="Desactivar"
	busy={togglingStatus}
	onCancel={() => (confirmDisable = false)}
	onConfirm={() => void setDisabled(true)}
/>

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		margin-bottom: 1rem;
		color: var(--color-muted);
		font-size: 0.85rem;
		text-decoration: none;
	}
	.head {
		margin-bottom: 1.25rem;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.35rem;
		font-size: 0.88rem;
	}
	.alert {
		color: var(--color-bad);
	}
	.tabs {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 1.75rem;
		overflow-x: auto;
		border-bottom: 1px solid var(--color-border);
		scrollbar-width: none;
	}
	.tab {
		flex-shrink: 0;
		padding: 0.7rem 0.85rem;
		border: 0;
		border-bottom: 2px solid transparent;
		background: none;
		color: var(--color-muted);
		font-weight: 600;
		cursor: pointer;
	}
	.tab.active {
		border-bottom-color: var(--color-accent);
		color: var(--color-text);
	}
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
	.block {
		margin-bottom: 2rem;
	}
	.block > .section-label {
		margin-bottom: 0.6rem;
	}
	.plain {
		background: none;
	}
	.day {
		width: 6.5rem;
		color: var(--color-subtle);
	}
	.dot {
		width: 0.6rem;
		height: 0.6rem;
		flex-shrink: 0;
		border-radius: 999px;
	}
	.routine {
		border-bottom: 1px solid var(--color-border-soft);
	}
	.routine:last-child {
		border-bottom: 0;
	}
	.routine summary {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.8rem 0;
		cursor: pointer;
	}
	.routine ol {
		margin: 0 0 0.9rem 2.2rem;
		padding: 0;
		font-size: 0.9rem;
	}
	.small {
		font-size: 0.78rem;
	}
	.note {
		margin-top: 0.75rem;
	}
	.password {
		display: flex;
		gap: 0.5rem;
		max-width: 28rem;
	}
	.block .muted {
		margin-bottom: 0.9rem;
	}
</style>
