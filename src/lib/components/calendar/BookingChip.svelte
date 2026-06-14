<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Pathname, ResolvedPathname } from '$app/types';
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		bookingId: string; // UUID v7 string (was number before Story 4.4)
		timeRange: string; // pre-formatted "HH:MM–HH:MM" (computed in +page.server.ts)
		eventName: string | null;
		/** True when this cell is a continuation day (not the booking's start day). */
		isContinuation?: boolean;
	}

	let { bookingId, timeRange, eventName, isContinuation = false }: Props = $props();

	const href: ResolvedPathname = $derived(resolve(`/bookings/${bookingId}` as Pathname));
</script>

<a
	{href}
	data-booking-id={bookingId}
	class="block w-full text-left rounded-md bg-green-500 text-white shadow-md px-2 py-1 text-sm leading-tight hover:bg-green-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
	aria-label="{m.calendar_booked_label()}{eventName ? `: ${eventName}` : ''}{isContinuation
		? ''
		: ` ${timeRange}`}"
>
	{#if isContinuation}
		<span class="font-medium opacity-75">{m.calendar_booking_continuation_label()}</span>
	{:else}
		<span class="font-medium">{timeRange}</span>
		{#if eventName}
			<span class="block truncate text-xs opacity-90">{eventName}</span>
		{/if}
	{/if}
</a>
