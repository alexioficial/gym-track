<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from './Icon.svelte';
	import SessionForm from './SessionForm.svelte';
	import { coachData, queueCoachMutation } from '$lib/offline/coach-store';
	import { newEntityId } from '$lib/offline/store';
	import { formatDate, lastPerformanceByExercise } from '$lib/utils/progression';

	// Logs a new session for a client, or edits one of theirs. It works offline:
	// the change goes to the coach's queue and syncs later.
	let { sessionId = null }: { sessionId?: string | null } = $props();

	const clientId = $derived(page.params.id!);
	const entry = $derived($coachData?.clients.find((item) => item.client.id === clientId) ?? null);
	const snapshot = $derived(entry?.snapshot ?? null);
	const session = $derived(
		sessionId ? (snapshot?.sessions.find((item) => item.id === sessionId) ?? null) : null
	);
	const lastByExercise = $derived(
		snapshot
			? lastPerformanceByExercise(
					snapshot.sessions,
					session ? { excludeSessionId: session.id, onOrBefore: session.date } : undefined
				)
			: {}
	);
	const initialRoutineId = $derived(page.url.searchParams.get('routine') ?? '');
	const backHref = $derived(resolve('/coach/clients/[id]', { id: clientId }));

	type SessionInput = {
		date: string;
		routineId: string | null;
		notes: string | undefined;
		entries: Array<{ exerciseId: string; sets: Array<{ weight: number; reps: number }> }>;
	};

	async function save(input: SessionInput) {
		await queueCoachMutation(
			clientId,
			'session',
			session ? 'update' : 'create',
			session?.id ?? newEntityId(),
			input
		);
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve() plus a query string
		await goto(`${backHref}?tab=history`);
	}

	async function remove() {
		if (!session) return;
		await queueCoachMutation(clientId, 'session', 'delete', session.id);
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve() plus a query string
		await goto(`${backHref}?tab=history`);
	}

	async function createExercise(input: { name: string; muscleGroup: string }) {
		const id = newEntityId();
		await queueCoachMutation(clientId, 'exercise', 'create', id, input);
		return id;
	}
</script>

<a href={backHref} class="back"
	><Icon name="back" size={16} /> {entry?.client.username ?? 'Cliente'}</a
>

{#if !entry || !snapshot}
	<p class="muted">Este cliente ya no está en tu lista.</p>
{:else if sessionId && !session}
	<p class="muted">Esta sesión ya no existe.</p>
{:else}
	<header class="head">
		<h1 class="page-title">
			{session ? 'Editar sesión' : 'Anotar sesión'}
		</h1>
		<p class="muted">
			{entry.client.username}{#if session}
				· {formatDate(session.date)}{/if}
		</p>
	</header>
	{#key sessionId ?? 'new'}
		<SessionForm
			exercises={snapshot.exercises}
			routines={snapshot.routines}
			mode={session ? 'edit' : 'create'}
			{session}
			{initialRoutineId}
			{lastByExercise}
			draftKey={`gym:coach-draft:${page.data.user?.id}:${clientId}`}
			onCreateExercise={createExercise}
			onSave={save}
			onDelete={session ? remove : undefined}
		/>
	{/key}
{/if}

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
		margin-bottom: 1.5rem;
	}
</style>
