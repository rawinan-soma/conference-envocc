<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { superForm } from 'sveltekit-superforms';
	import * as m from '$lib/paraglide/messages.js';
	import BookingForm from '$lib/components/booking/BookingForm.svelte';

	import type { PageData } from './$types.js';

	const { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, submitting } = superForm(data.form);
</script>

<svelte:head>
	<title>{m.booking_new_title()} — {m.app_name()}</title>
</svelte:head>

<main class="mx-auto max-w-2xl px-4 py-8">
	<div class="mb-6 flex items-center gap-4">
		<a
			href={resolve('/calendar' as Pathname)}
			class="text-sm text-muted-foreground hover:underline"
		>
			&larr; {m.calendar_title()}
		</a>
	</div>

	<h1 class="mb-8 text-2xl font-semibold tracking-tight text-foreground">
		{m.booking_new_title()}
	</h1>

	<BookingForm
		{form}
		{errors}
		{enhance}
		{submitting}
		rooms={data.rooms}
		userProfile={data.userProfile}
	/>
</main>
