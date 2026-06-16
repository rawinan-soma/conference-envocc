<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Pathname, ResolvedPathname } from '$app/types';
	import * as m from '$lib/paraglide/messages.js';

	import type { PageData } from './$types.js';

	const { data }: { data: PageData } = $props();

	let showCancelModal = $state(false);
	let showCloseRegistrationModal = $state(false);

	const duplicateHref = $derived(
		`${resolve('/bookings/new' as Pathname)}?from=${data.booking.id}` as ResolvedPathname
	);

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
		// Guard against unparseable / unbounded ranges. `Intl.DateTimeFormat.format()`
		// does NOT throw on an Invalid Date — it returns the literal string "Invalid Date".
		// So an empty try/catch is insufficient: we must check the dates explicitly and
		// fall back to the raw range string when either bound fails to parse.
		const startDate = new Date(start);
		const endDate = new Date(end);
		if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
			return raw;
		}
		return `${fmt.format(startDate)} – ${fmt.format(endDate)}`;
	});

	// Derive resolved hrefs for navigation — required by svelte/no-navigation-without-resolve rule.
	const calendarHref = $derived(resolve('/calendar' as Pathname));
	const qrDownloadHref = $derived(resolve(`/bookings/${data.booking.id}/qr` as Pathname));

	// Copy the registration link to the clipboard.
	// `navigator.clipboard` is undefined on insecure (non-HTTPS) origins and
	// writeText() rejects on permission denial — guard both so the failure is not
	// a silent unhandled promise rejection.
	async function copyRegistrationLink(url: string): Promise<void> {
		try {
			await navigator.clipboard?.writeText(url);
		} catch {
			// Clipboard unavailable or permission denied — the link is still visible
			// and selectable on-screen, so no user-facing error is surfaced here.
		}
	}
</script>

<svelte:head>
	<title>{m.booking_detail_title()} — {m.app_name()}</title>
</svelte:head>

<main class="mx-auto max-w-2xl px-4 py-8">
	<div class="mb-6 flex items-center gap-4">
		<a href={calendarHref} class="text-sm text-muted-foreground hover:underline">
			&larr; {m.calendar_title()}
		</a>
	</div>

	<h1 class="mb-8 text-2xl font-semibold tracking-tight text-foreground">
		{m.booking_detail_title()}
	</h1>

	<!-- Booking confirmation success banner (Story 4.5) -->
	<div class="mb-8 rounded-lg border border-green-200 bg-green-50 p-4">
		<p class="text-sm font-medium text-green-800">{m.booking_confirmation_success()}</p>
	</div>

	<div class="space-y-4 rounded-lg border border-border p-6">
		<!-- Event name -->
		<div>
			<h2 class="text-xl font-semibold">{data.booking.eventName}</h2>
			<p class="mt-1 text-sm text-muted-foreground">{timeRange}</p>
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

		<!-- Time (server-formatted) -->
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
			<span class="text-sm font-medium"
				>{data.booking.cateringEnabled ? m.booking_value_yes() : m.booking_value_no()}</span
			>
		</div>

		<!-- Registration -->
		<div class="flex flex-col gap-0.5">
			<span class="text-xs text-muted-foreground">{m.booking_registration_label()}</span>
			<span class="text-sm font-medium"
				>{data.booking.registrationEnabled ? m.booking_value_yes() : m.booking_value_no()}</span
			>
		</div>
	</div>

	<!-- Registration link + QR (Story 4.5) -->
	{#if data.registrationUrl}
		<!-- Registration link section -->
		<section class="mb-8 mt-6" aria-labelledby="registration-link-heading">
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
					onclick={() => copyRegistrationLink(data.registrationUrl!)}
					class="shrink-0 rounded-sm px-2 py-1 text-xs font-medium hover:bg-accent"
					aria-label={m.booking_copy_link_aria()}
				>
					{m.booking_copy_link_button()}
				</button>
			</div>
		</section>

		<!-- QR code section -->
		{#if data.qrDataUrl}
			<section class="mb-6" aria-labelledby="qr-heading">
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
		<p class="mt-6 text-sm text-muted-foreground">{m.booking_registration_not_enabled()}</p>
	{/if}

	<!-- Actions (Story 4.7) -->
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

		{#if data.booking.status === 'active' && data.booking.registrationEnabled}
			<button
				type="button"
				onclick={() => (showCloseRegistrationModal = true)}
				class="inline-flex items-center justify-center rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				{m.booking_close_registration_button()}
			</button>
		{/if}

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
					<!-- Cross-namespace reuse: room_cancel_button renders the right "Cancel"/"ยกเลิก"
					     dismiss label in both locales; a dedicated booking_* key would ship a blank
					     th string until translated, so we reuse the existing one. -->
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

<!-- Close registration confirm modal (Story 5.6, AC-2) -->
{#if showCloseRegistrationModal}
	<dialog
		open
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		aria-labelledby="close-reg-dialog-title"
	>
		<div class="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
			<h2 id="close-reg-dialog-title" class="mb-2 text-lg font-semibold">
				{m.booking_close_registration_confirm_title()}
			</h2>
			<p class="mb-6 text-sm text-muted-foreground">
				{m.booking_close_registration_confirm_body()}
			</p>
			<div class="flex justify-end gap-3">
				<button
					type="button"
					onclick={() => (showCloseRegistrationModal = false)}
					class="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<!-- Cross-namespace reuse: room_cancel_button renders the right "Cancel"/"ยกเลิก"
					     dismiss label in both locales -->
					{m.room_cancel_button()}
				</button>
				<form method="POST" action="?/closeRegistration">
					<button
						type="submit"
						class="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						{m.booking_close_registration_confirm_action()}
					</button>
				</form>
			</div>
		</div>
	</dialog>
{/if}
