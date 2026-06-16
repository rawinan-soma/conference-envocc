<!--
  Registrant List page — Story 5.8
  Route: /bookings/[id]/registrants

  Displays all registrants for a booking.
  Each row shows: name (first + last), organization, email, and status badge.

  AC Coverage:
    AC-1: Lists all registrants with name, org, email, and status columns
    AC-2: Status badge — "Registered" (green-100/green-700) / "Cancelled" (amber-50/stone-500)
          Text label always present — color is never the only status indicator (WCAG 2.1 AA)
    AC-4: Empty state message when booking has no registrants
    AC-7: All strings via Paraglide (no hardcoded English/Thai literals)
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import * as m from '$lib/paraglide/messages.js';
	import type { PageData } from './$types.js';

	const { data }: { data: PageData } = $props();

	const backHref = $derived(resolve(`/bookings/${data.booking.id}` as Pathname));
</script>

<svelte:head>
	<title>{m.registrant_list_title()} — {data.booking.eventName} — {m.app_name()}</title>
</svelte:head>

<main class="mx-auto max-w-4xl px-4 py-8">
	<div class="mb-6 flex items-center gap-4">
		<a href={backHref} class="text-sm text-muted-foreground hover:underline">
			&larr; {m.registrant_list_back_link()}
		</a>
	</div>

	<h1 class="mb-2 text-2xl font-semibold tracking-tight text-foreground">
		{m.registrant_list_title()}
	</h1>
	<p class="mb-8 text-sm text-muted-foreground">{data.booking.eventName}</p>

	{#if data.registrants.length === 0}
		<!-- AC-4: Empty state -->
		<div class="rounded-md border border-border bg-muted/20 p-8 text-center">
			<p class="text-sm text-muted-foreground">{m.registrant_list_empty_state()}</p>
		</div>
	{:else}
		<!-- AC-1: Registrant table -->
		<div class="overflow-x-auto rounded-md border border-border">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-border bg-muted/30">
						<th
							class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
						>
							{m.registrant_list_column_name()}
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
						>
							{m.registrant_list_column_org()}
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
						>
							{m.registrant_list_column_email()}
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
						>
							{m.registrant_list_column_status()}
						</th>
					</tr>
				</thead>
				<tbody>
					{#each data.registrants as reg (reg.id)}
						<tr class="border-b border-border last:border-0 hover:bg-muted/10">
							<td class="px-4 py-3 font-medium text-foreground">
								{reg.firstName}
								{reg.lastName}
							</td>
							<td class="px-4 py-3 text-foreground">
								{reg.organization}
							</td>
							<td class="px-4 py-3 text-foreground">
								{reg.email}
							</td>
							<td class="px-4 py-3">
								<!-- AC-2: Status badge — text label is always present (WCAG 2.1 AA) -->
								<span
									class={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${
										reg.status === 'registered'
											? 'bg-green-100 text-green-700'
											: 'bg-amber-50 text-stone-500'
									}`}
								>
									{reg.status === 'registered'
										? m.registrant_list_status_registered()
										: m.registrant_list_status_cancelled()}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</main>
