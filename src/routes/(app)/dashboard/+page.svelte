<!--
  Organizer Dashboard — Story 4.8

  Displays all upcoming, non-cancelled bookings for the authenticated organizer.

  AC Coverage:
    AC-1 (FR-050): lists only the current organizer's upcoming non-cancelled bookings
    AC-2 (FR-051): BookingCard shows event name, room, date/time, registrant count placeholder
    AC-3 (FR-052): copy-link button per booking card (registrationEnabled only)
    AC-4 (UXD-020): empty state with CTA to room calendar
    AC-5 (UXD-020): skeleton loading while data loads
    AC-7: all UI strings via Paraglide (m.* calls)
    AC-11: this route resolves the 2.3 profile-complete → /dashboard redirect
-->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { resolve } from '$app/paths';
	import type { Pathname, ResolvedPathname } from '$app/types';
	import * as m from '$lib/paraglide/messages.js';
	import BookingCard from '$lib/components/booking/BookingCard.svelte';

	import type { PageData } from './$types.js';

	const { data }: { data: PageData } = $props();

	const calendarHref = $derived(resolve('/calendar' as Pathname) as ResolvedPathname);

	// Simple in-component toast state for copy-link success (AC-3).
	// Matches DESIGN.md Toast pattern: top-right, auto-dismiss after 2.5s.
	let toastVisible = $state(false);
	let toastTimer: ReturnType<typeof setTimeout> | null = null;

	function showCopyToast(): void {
		if (toastTimer) clearTimeout(toastTimer);
		toastVisible = true;
		toastTimer = setTimeout(() => {
			toastVisible = false;
			toastTimer = null;
		}, 2500);
	}

	// Clear any pending toast timer on unmount to avoid a state update after destroy.
	onDestroy(() => {
		if (toastTimer) clearTimeout(toastTimer);
	});
</script>

<svelte:head>
	<title>{m.dashboard_title()} — {m.app_name()}</title>
</svelte:head>

<!-- Copy-link success toast (top-right, auto-dismiss) -->
{#if toastVisible}
	<div
		role="status"
		aria-live="polite"
		class="fixed right-4 top-4 z-50 rounded-md border border-border bg-background px-4 py-2 shadow-lg text-sm font-medium text-foreground transition-opacity"
	>
		{m.dashboard_copy_link_success()}
	</div>
{/if}

<main class="mx-auto max-w-3xl px-4 py-8">
	<h1 class="mb-6 text-2xl font-semibold tracking-tight text-foreground">
		{m.dashboard_title()}
	</h1>

	{#await data.bookings}
		<!-- Skeleton loading (AC-5, UXD-020): 3 shimmer cards shown while data streams in -->
		<ul class="flex flex-col gap-4" aria-busy="true" aria-label={m.dashboard_title()}>
			{#each [0, 1, 2] as skeletonIndex (skeletonIndex)}
				<li
					class="animate-pulse rounded-md border border-border bg-card p-5 shadow-sm"
					aria-hidden="true"
				>
					<div class="mb-3 h-5 w-2/3 rounded bg-muted"></div>
					<div class="mb-2 h-4 w-1/3 rounded bg-muted"></div>
					<div class="h-4 w-1/2 rounded bg-muted"></div>
				</li>
			{/each}
		</ul>
	{:then bookings}
		{#if bookings.length === 0}
			<!-- Empty state (AC-4, UXD-020) -->
			<div class="py-12 text-center">
				<p class="mb-4 text-muted-foreground">{m.dashboard_empty_title()}</p>
				<a
					href={calendarHref}
					class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					{m.dashboard_empty_cta()}
				</a>
			</div>
		{:else}
			<!-- Booking cards list (AC-2, AC-3) -->
			<ul class="flex flex-col gap-4" aria-label={m.dashboard_title()}>
				{#each bookings as booking (booking.id)}
					<li>
						<BookingCard
							{booking}
							registrationUrl={booking.registrationUrl}
							cateringCounts={booking.cateringCounts}
							onCopy={showCopyToast}
						/>
					</li>
				{/each}
			</ul>
		{/if}
	{:catch}
		<!-- Streamed query rejected (DB error). Show a calm error instead of a blank page. -->
		<div role="alert" class="py-12 text-center">
			<p class="text-muted-foreground">{m.dashboard_load_error()}</p>
		</div>
	{/await}
</main>
