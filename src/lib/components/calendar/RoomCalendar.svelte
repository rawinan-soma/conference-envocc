<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Pathname, ResolvedPathname } from '$app/types';
	import type { CalendarGrid } from '$lib/types/calendar.js';
	import BookingChip from './BookingChip.svelte';
	import { formatDateBangkok } from '$lib/utils/date.js';
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		grid: CalendarGrid;
		weekDates: string[]; // 7 ISO strings, Mon–Sun
	}

	let { grid, weekDates }: Props = $props();

	/** Resolve a pre-computed href that may include query params. */
	function resolveHref(href: string): ResolvedPathname {
		const qIdx = href.indexOf('?');
		if (qIdx === -1) return resolve(href as Pathname) as ResolvedPathname;
		return `${resolve(href.slice(0, qIdx) as Pathname)}${href.slice(qIdx)}` as ResolvedPathname;
	}
</script>

<div class="overflow-x-auto" role="grid" aria-label={m.calendar_title()}>
	<!-- Column headers: day names -->
	<div class="grid" role="row" style="grid-template-columns: 12rem repeat(7, 1fr);">
		<div class="p-2 text-sm font-semibold text-gray-500" role="columnheader">
			{m.calendar_rooms_column_header()}
		</div>
		{#each weekDates as isoDate (isoDate)}
			<div class="p-2 text-center text-sm font-semibold" role="columnheader">
				{formatDateBangkok(new Date(isoDate), 'dayShort')}
				<span class="block text-xs font-normal text-gray-500">
					{formatDateBangkok(new Date(isoDate), 'date').slice(8)}
				</span>
			</div>
		{/each}
	</div>

	<!-- Room rows -->
	{#each grid as row (row.room.id)}
		<div class="grid border-t" role="row" style="grid-template-columns: 12rem repeat(7, 1fr);">
			<!-- Room name column -->
			<div class="p-2 text-sm font-medium border-r" role="rowheader">
				<span>{row.room.name}</span>
				<span class="block text-xs text-gray-500"
					>{m.calendar_room_floor_prefix({ floor: row.room.floor })}</span
				>
			</div>

			<!-- Day cells -->
			{#each row.cells as cell, dayIndex (dayIndex)}
				<div
					class="min-h-16 p-1 border-r relative"
					class:bg-green-100={cell.state === 'available'}
					class:bg-amber-50={cell.state === 'blocked'}
					role="gridcell"
					aria-label={cell.ariaLabel}
				>
					{#if cell.state === 'available'}
						<a
							href={resolveHref(cell.href)}
							class="absolute inset-0 flex items-center justify-center text-xs text-green-700 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
							aria-label={cell.ariaLabel}
						>
							<span class="sr-only">{m.calendar_available_label()}</span>
						</a>
					{:else if cell.state === 'blocked'}
						<!-- Blocked: hatched background + visible label (WCAG color-not-alone) -->
						<div
							class="absolute inset-0 pointer-events-none"
							style="background-image: repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.06) 4px, rgba(0,0,0,0.06) 8px);"
							aria-hidden="true"
						></div>
						<span class="relative z-10 text-xs text-amber-800 font-medium px-1">
							{m.calendar_blocked_label()}
							{#if cell.blocks[0]?.reason}
								<span class="block text-xs font-normal opacity-75">{cell.blocks[0].reason}</span>
							{/if}
						</span>
					{:else}
						<!-- Booked: one or more BookingChips stacked vertically -->
						<div class="flex flex-col gap-1">
							{#each cell.bookings as booking (booking.id)}
								<BookingChip
									bookingId={booking.id}
									timeRange={booking.timeRange}
									eventName={booking.eventName}
									isContinuation={booking.isContinuation}
								/>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/each}
</div>
