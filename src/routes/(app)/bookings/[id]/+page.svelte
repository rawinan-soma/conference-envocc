<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import * as m from '$lib/paraglide/messages.js';
	import type { PageData } from './$types.js';

	const { data }: { data: PageData } = $props();

	// Derive display-friendly time range from tstzrange string.
	// tstzrange is stored as a raw string by the custom Drizzle type — parse carefully.
	// Display uses the Asia/Bangkok locale (Intl.DateTimeFormat).
	// Use $derived.by() for multi-line computations — referenced as `timeRange` (no parens).
	const timeRange = $derived.by(() => {
		// data.booking.during is a tstzrange string like:
		// `["2026-07-01 09:00:00+07","2026-07-01 10:00:00+07")`
		// Simple extraction: strip leading bracket/paren, strip trailing bracket/paren, split on comma
		const raw: string = data.booking.during as unknown as string;
		const inner = raw.replace(/^[[(]/, '').replace(/[\])]$/, '');
		const [start, end] = inner.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
		const fmt = new Intl.DateTimeFormat('en-TH', {
			timeZone: 'Asia/Bangkok',
			dateStyle: 'medium',
			timeStyle: 'short'
		});
		try {
			return `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`;
		} catch {
			return raw;
		}
	});

	// Derive resolved hrefs for navigation — required by svelte/no-navigation-without-resolve rule.
	const calendarHref = $derived(resolve('/calendar' as Pathname));
	const qrDownloadHref = $derived(resolve(`/bookings/${data.booking.id}/qr` as Pathname));
</script>

<svelte:head>
	<title>{m.booking_detail_title()} — {m.app_name()}</title>
</svelte:head>

<main class="mx-auto max-w-2xl px-4 py-8">
	<div class="mb-6">
		<a href={calendarHref} class="text-sm text-muted-foreground hover:underline">
			&larr; {m.calendar_title()}
		</a>
	</div>

	<!-- Confirmation banner -->
	<div class="mb-8 rounded-lg border border-green-200 bg-green-50 p-4">
		<p class="text-sm font-medium text-green-800">{m.booking_confirmation_success()}</p>
	</div>

	<!-- Event details -->
	<h1 class="mb-2 text-2xl font-semibold tracking-tight text-foreground">
		{data.booking.eventName}
	</h1>
	<p class="mb-6 text-sm text-muted-foreground">{timeRange}</p>

	{#if data.registrationUrl}
		<!-- Registration link section -->
		<section class="mb-8" aria-labelledby="registration-link-heading">
			<h2 id="registration-link-heading" class="mb-2 text-lg font-medium">
				{m.booking_registration_link_heading()}
			</h2>
			<p class="mb-3 text-sm text-muted-foreground">
				{m.booking_registration_link_hint()}
			</p>

			<!-- Link display with copy -->
			<div class="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
				<!-- "external" in rel tells eslint-plugin-svelte this is an external URL — no resolve() needed -->
				<a
					href={data.registrationUrl}
					target="_blank"
					rel="noopener noreferrer external"
					class="flex-1 truncate font-mono text-sm text-primary hover:underline"
					aria-label={m.booking_registration_link_aria()}
				>
					{data.registrationUrl}
				</a>
				<button
					type="button"
					onclick={() => navigator.clipboard.writeText(data.registrationUrl!)}
					class="shrink-0 rounded-sm px-2 py-1 text-xs font-medium hover:bg-accent"
					aria-label={m.booking_copy_link_aria()}
				>
					{m.booking_copy_link_button()}
				</button>
			</div>
		</section>

		<!-- QR code section -->
		{#if data.qrDataUrl}
			<section aria-labelledby="qr-heading">
				<h2 id="qr-heading" class="mb-2 text-lg font-medium">
					{m.booking_qr_heading()}
				</h2>
				<p class="mb-3 text-sm text-muted-foreground">{m.booking_qr_hint()}</p>

				<div class="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
					<img
						src={data.qrDataUrl}
						alt={m.booking_qr_alt()}
						width="160"
						height="160"
						class="rounded-md border"
					/>
					<a
						href={qrDownloadHref}
						download="registration-qr.png"
						class="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
					>
						{m.booking_qr_download_button()}
					</a>
				</div>
			</section>
		{/if}
	{:else}
		<!-- Registration not enabled -->
		<p class="text-sm text-muted-foreground">{m.booking_registration_not_enabled()}</p>
	{/if}
</main>
