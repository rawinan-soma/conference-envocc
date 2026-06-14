<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		bookingId: number; // integer PK (UUID v7 in Story 4.4 — change type then)
		timeRange: string; // pre-formatted "HH:MM–HH:MM" (computed in +page.server.ts)
		eventName: string | null; // null for Story 4.3; Story 4.4 passes event name
		/** True when this cell is a continuation day (not the booking's start day). */
		isContinuation?: boolean;
	}

	let { bookingId, timeRange, eventName, isContinuation = false }: Props = $props();
</script>

<button
	type="button"
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
</button>
