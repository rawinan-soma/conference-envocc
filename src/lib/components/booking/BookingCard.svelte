<!--
  BookingCard.svelte — Story 4.8 + Story 5.7
  Displays a single upcoming booking on the organizer dashboard.

  Props:
    - booking:         UpcomingBookingRow (all booking fields + roomName from JOIN)
    - registrationUrl: string | null       (pre-built by page.server.ts)
    - cateringCounts:  CateringCounts | null (non-null when cateringEnabled=true; Story 5.7)
    - onCopy:          optional callback invoked after a successful clipboard write

  AC Coverage:
    AC-2 (FR-051): event name, room name, date/time (Bangkok timezone)
    AC-3 (FR-052): copy-link button when registrationEnabled; same clipboard guard as /bookings/[id]
    Story 5.7 AC-1: catering summary section rendered when cateringCounts is non-null
    Story 5.7 AC-7: registrant count placeholder left untouched (Story 5.8 will replace it)
    Design: card surface bg-card border rounded-md shadow-sm
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import * as m from '$lib/paraglide/messages.js';
	import { parseTstzrange } from '$lib/utils/tstzrange.js';
	import { formatDateBangkok } from '$lib/utils/date.js';
	import type { UpcomingBookingRow } from '$lib/server/db/queries/bookings.js';
	// Type-only import is erased at build time, so it pulls no server runtime into the
	// client bundle (same pattern as UpcomingBookingRow above). Using the canonical type
	// directly prevents silent drift if the CateringCounts shape changes server-side.
	import type { CateringCounts } from '$lib/server/db/queries/registrations.js';

	const {
		booking,
		registrationUrl = null,
		cateringCounts = null,
		onCopy
	}: {
		booking: UpcomingBookingRow;
		registrationUrl?: string | null;
		cateringCounts?: CateringCounts | null;
		onCopy?: () => void;
	} = $props();

	// Parse tstzrange for display (Bangkok timezone).
	const range = $derived(parseTstzrange(booking.during as unknown as string));
	const dateStr = $derived(range ? formatDateBangkok(range.lower, 'date') : '');
	const startTime = $derived(range ? formatDateBangkok(range.lower, 'time') : '');
	const endTime = $derived(range ? formatDateBangkok(range.upper, 'time') : '');

	const manageHref = $derived(resolve(`/bookings/${booking.id}` as Pathname));

	// Copy the registration link to clipboard.
	// Uses the same navigator.clipboard?.writeText() guard pattern as /bookings/[id]/+page.svelte.
	// onCopy is only invoked when the write actually succeeded — guard on clipboard availability
	// first so the "Link copied" toast does not fire when nothing was written.
	async function copyLink(url: string): Promise<void> {
		if (!navigator.clipboard) {
			// Clipboard API unavailable (insecure origin or old browser) — silent, no toast.
			return;
		}
		try {
			await navigator.clipboard.writeText(url);
			onCopy?.();
		} catch {
			// writeText() rejected (permission denied) — silent per pattern.
		}
	}
</script>

<article
	class="flex flex-col gap-3 rounded-md border border-border bg-card p-4 shadow-sm"
	aria-label={booking.eventName}
>
	<!-- Event name + manage link -->
	<div class="flex items-start justify-between gap-2">
		<h2 class="text-base font-semibold leading-snug text-foreground">
			{booking.eventName}
		</h2>
		<a
			href={manageHref}
			class="shrink-0 rounded-sm px-2 py-1 text-xs font-medium text-primary hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			{m.dashboard_manage_button()}
		</a>
	</div>

	<!-- Room -->
	<div class="flex flex-col gap-0.5">
		<span class="text-xs text-muted-foreground">{m.dashboard_booking_card_room_label()}</span>
		<span class="text-sm font-medium text-foreground">{booking.roomName}</span>
	</div>

	<!-- Date & time -->
	<div class="flex flex-col gap-0.5">
		<span class="text-xs text-muted-foreground">{m.dashboard_booking_card_time_label()}</span>
		<span class="text-sm font-medium text-foreground">
			{dateStr}
			{#if startTime && endTime}
				&nbsp;{startTime}–{endTime}
			{/if}
		</span>
	</div>

	<!-- Registrant count (Story 5.8 AC-5 / FR-052) -->
	<div class="flex flex-col gap-0.5">
		<span class="text-xs text-muted-foreground">{m.dashboard_registrant_count_label()}</span>
		<span class="text-sm font-medium text-foreground">{booking.registrantCount}</span>
	</div>

	<!-- Catering summary (Story 5.7 AC-1 — only when cateringCounts is non-null / cateringEnabled) -->
	{#if cateringCounts}
		<div class="flex flex-col gap-1">
			<span class="text-xs text-muted-foreground">{m.catering_summary_heading()}</span>
			<div class="flex flex-col gap-0.5">
				<div class="flex justify-between">
					<span class="text-xs text-muted-foreground">{m.catering_summary_normal_label()}</span>
					<span class="text-sm font-medium text-foreground">{cateringCounts.normal}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-xs text-muted-foreground">{m.catering_summary_vegetarian_label()}</span>
					<span class="text-sm font-medium text-foreground">{cateringCounts.vegetarian}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-xs text-muted-foreground">{m.catering_summary_muslim_label()}</span>
					<span class="text-sm font-medium text-foreground">{cateringCounts.muslim}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-xs text-muted-foreground">{m.catering_summary_other_label()}</span>
					<span class="text-sm font-medium text-foreground">{cateringCounts.other}</span>
				</div>
			</div>
		</div>
	{/if}

	<!-- Copy registration link (only when registrationEnabled) -->
	{#if booking.registrationEnabled && registrationUrl}
		<div class="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
			<!-- "external" in rel: tells eslint-plugin-svelte this is an external URL -->
			<a
				href={registrationUrl}
				target="_blank"
				rel="noopener noreferrer external"
				class="flex-1 truncate font-mono text-xs text-primary hover:underline"
				aria-label={m.booking_registration_link_aria()}
			>
				{registrationUrl}
			</a>
			<button
				type="button"
				onclick={() => copyLink(registrationUrl)}
				class="shrink-0 rounded-sm px-2 py-1 text-xs font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				aria-label={m.booking_copy_link_aria()}
			>
				{m.booking_copy_link_button()}
			</button>
		</div>
	{/if}
</article>
