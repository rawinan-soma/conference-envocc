<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Pathname, ResolvedPathname } from '$app/types';
	import type { PageData } from './$types.js';
	import RoomCalendar from '$lib/components/calendar/RoomCalendar.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { formatDateBangkok, addDays } from '$lib/utils/date.js';

	let { data }: { data: PageData } = $props();

	// Svelte 5 runes: const x = $derived(expr) — NOT "$derived const x"
	const weekStartDate = $derived(new Date(data.weekStart));
	const weekEndDate = $derived(addDays(weekStartDate, 6)); // Sunday
	const weekLabel = $derived(
		m.calendar_week_heading({
			start: formatDateBangkok(weekStartDate, 'date'),
			end: formatDateBangkok(weekEndDate, 'date')
		})
	);
	const prevHref = $derived(
		`${resolve('/calendar' as Pathname)}?week=${data.prevWeek}` as ResolvedPathname
	);
	const nextHref = $derived(
		`${resolve('/calendar' as Pathname)}?week=${data.nextWeek}` as ResolvedPathname
	);
</script>

<svelte:head>
	<title>{m.calendar_title()}</title>
</svelte:head>

<div class="container mx-auto px-4 py-6">
	<div class="flex items-center justify-between mb-4">
		<h1 class="text-2xl font-semibold">{m.calendar_title()}</h1>
		<div class="flex gap-2">
			<a href={prevHref} class="btn btn-sm variant-ghost">
				&larr; {m.calendar_prev_week()}
			</a>
			<a href={nextHref} class="btn btn-sm variant-ghost">
				{m.calendar_next_week()} &rarr;
			</a>
		</div>
	</div>

	<p class="text-sm text-gray-600 mb-4">{weekLabel}</p>

	{#if data.grid.length === 0}
		<p class="text-center py-12 text-gray-500">{m.calendar_empty_state()}</p>
	{:else}
		<RoomCalendar grid={data.grid} weekDates={data.weekDates} />
	{/if}
</div>
