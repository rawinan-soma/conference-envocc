<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Pathname, ResolvedPathname } from '$app/types';
	import * as m from '$lib/paraglide/messages.js';

	import type { PageData } from './$types.js';

	const { data }: { data: PageData } = $props();

	let showCancelModal = $state(false);

	const duplicateHref = $derived(
		`${resolve('/bookings/new' as Pathname)}?from=${data.booking.id}` as ResolvedPathname
	);
</script>

<svelte:head>
	<title>{m.booking_detail_title()} — {m.app_name()}</title>
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
		{m.booking_detail_title()}
	</h1>

	<div class="rounded-lg border border-border p-6 space-y-4">
		<!-- Event name -->
		<div>
			<h2 class="text-xl font-semibold">{data.booking.eventName}</h2>
		</div>

		<!-- Status -->
		<div class="flex items-center gap-2">
			<span
				class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {data.booking
					.status === 'active'
					? 'bg-green-100 text-green-800'
					: 'bg-gray-100 text-gray-800'}"
			>
				{data.booking.status === 'active'
					? m.booking_status_active()
					: m.booking_status_cancelled()}
			</span>
		</div>

		<!-- Room -->
		{#if data.room}
			<div class="flex flex-col gap-0.5">
				<span class="text-xs text-muted-foreground">{m.booking_room_label()}</span>
				<span class="text-sm font-medium"
					>{data.room.name} — {m.calendar_room_floor_prefix({
						floor: String(data.room.floor)
					})}</span
				>
			</div>
		{/if}

		<!-- Time -->
		{#if data.startAt && data.endAt}
			<div class="flex flex-col gap-0.5">
				<span class="text-xs text-muted-foreground">{m.booking_start_label()}</span>
				<span class="text-sm font-medium">{data.startAt}</span>
			</div>
			<div class="flex flex-col gap-0.5">
				<span class="text-xs text-muted-foreground">{m.booking_end_label()}</span>
				<span class="text-sm font-medium">{data.endAt}</span>
			</div>
		{/if}

		<!-- Catering -->
		<div class="flex flex-col gap-0.5">
			<span class="text-xs text-muted-foreground">{m.booking_catering_label()}</span>
			<span class="text-sm font-medium">{data.booking.cateringEnabled ? 'Yes' : 'No'}</span>
		</div>

		<!-- Registration -->
		<div class="flex flex-col gap-0.5">
			<span class="text-xs text-muted-foreground">{m.booking_registration_label()}</span>
			<span class="text-sm font-medium">{data.booking.registrationEnabled ? 'Yes' : 'No'}</span>
		</div>
	</div>

	<!-- Actions -->
	<div class="mt-6 flex flex-wrap gap-3">
		<a
			href={resolve(`/bookings/${data.booking.id}/edit` as Pathname)}
			class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			{m.booking_edit_button()}
		</a>

		<a
			href={duplicateHref}
			class="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			{m.booking_duplicate_button()}
		</a>

		{#if data.booking.status === 'active'}
			<button
				type="button"
				onclick={() => (showCancelModal = true)}
				class="inline-flex items-center justify-center rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				{m.booking_cancel_button()}
			</button>
		{/if}
	</div>
</main>

<!-- Cancel confirm modal (UX-DR8) -->
{#if showCancelModal}
	<dialog
		open
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		aria-labelledby="cancel-dialog-title"
	>
		<div class="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
			<h2 id="cancel-dialog-title" class="mb-2 text-lg font-semibold">
				{m.booking_cancel_confirm_title()}
			</h2>
			<p class="mb-6 text-sm text-muted-foreground">
				{m.booking_cancel_confirm_body()}
			</p>
			<div class="flex justify-end gap-3">
				<button
					type="button"
					onclick={() => (showCancelModal = false)}
					class="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					{m.room_cancel_button()}
				</button>
				<form method="POST" action="?/cancel">
					<button
						type="submit"
						class="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						{m.booking_cancel_confirm_action()}
					</button>
				</form>
			</div>
		</div>
	</dialog>
{/if}
