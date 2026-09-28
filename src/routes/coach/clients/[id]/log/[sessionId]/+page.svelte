<script lang="ts">
	import { page } from '$app/state';
	import CoachSessionEditor from '$lib/components/CoachSessionEditor.svelte';
</script>

<svelte:head><title>Editar sesión · Mis clientes</title></svelte:head>

<CoachSessionEditor sessionId={page.params.sessionId} />
