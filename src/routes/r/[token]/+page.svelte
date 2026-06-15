<script lang="ts">
	/**
	 * Public Registration Page — Story 5.1
	 *
	 * Route: /r/[token]
	 *
	 * This page is PUBLIC — no authentication required. It renders outside the (app)
	 * layout shell (no nav sidebar, no auth check). The /r prefix is already
	 * allow-listed in src/hooks.server.ts (routeGuards pattern).
	 *
	 * static/logo.svg must be provided at deployment time by the organization.
	 *
	 * AC Coverage:
	 *   AC-1 (FR-040): org logo, event name, date/time (Bangkok TZ), room, agenda, contact
	 *   AC-2: registrationEnabled=false → "Registration Closed" message; no form
	 *   AC-3 (R-001 BLOCK): token not found → server returns 404 (page.server.ts)
	 *   AC-4: agenda=null or empty → agenda section not rendered (no blank heading)
	 *   AC-5 (NFR-007): WCAG 2.1 AA — semantic HTML, role="alert" on closed state
	 *   AC-6: all UI strings via Paraglide (m.* calls); no Thai text in code
	 *
	 * Svelte 5 — uses $props() rune. No interactive state needed for this page.
	 */
	import * as m from '$lib/paraglide/messages.js';
	import type { PageData } from './$types.js';

	const { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{m.reg_page_title()} — {data.eventName}</title>
</svelte:head>

<main class="min-h-screen bg-background py-10">
	<div class="mx-auto max-w-2xl px-4">
		<!-- Org logo — static/logo.svg provided at deployment time by the organization -->
		<div class="mb-8 flex justify-center">
			<img src="/logo.svg" alt="Organization logo" class="h-16 w-auto object-contain" />
		</div>

		<!-- Event name heading -->
		<h1 class="mb-6 text-center text-3xl font-bold text-foreground">
			{data.eventName}
		</h1>

		<!-- Event info card -->
		<div class="bg-card mb-6 rounded-md border shadow-sm">
			<dl class="p-6">
				<!-- Date & Time -->
				<div class="mb-4">
					<dt class="text-muted-foreground mb-1 text-sm font-medium uppercase tracking-wide">
						{m.reg_page_date_label()}
					</dt>
					<dd class="text-foreground text-base">
						{data.dateStr}
						{#if data.startTime && data.endTime}
							&nbsp;&nbsp;{data.startTime}–{data.endTime}
						{/if}
					</dd>
				</div>

				<!-- Room -->
				<div class="mb-4">
					<dt class="text-muted-foreground mb-1 text-sm font-medium uppercase tracking-wide">
						{m.reg_page_room_label()}
					</dt>
					<dd class="text-foreground text-base">{data.roomName}</dd>
				</div>

				<!-- Agenda — only rendered if populated (AC-4) -->
				{#if data.agenda?.trim()}
					<div class="mb-4">
						<dt class="text-muted-foreground mb-1 text-sm font-medium uppercase tracking-wide">
							{m.reg_page_agenda_label()}
						</dt>
						<dd class="text-foreground whitespace-pre-wrap text-base">{data.agenda}</dd>
					</div>
				{/if}

				<!-- Contact -->
				<div class="mb-0">
					<dt class="text-muted-foreground mb-1 text-sm font-medium uppercase tracking-wide">
						{m.reg_page_contact_label()}
					</dt>
					<dd class="text-foreground text-base">
						{data.contactName}
						{#if data.contactPhone}
							&nbsp;·&nbsp;{data.contactPhone}
						{/if}
					</dd>
				</div>
			</dl>
		</div>

		<!-- Registration section -->
		<div class="bg-card rounded-md border shadow-sm">
			<div class="p-6">
				{#if !data.registrationEnabled}
					<!-- Closed state (AC-2): clear message shown; "Register to Attend" heading and form
					     fields are not rendered so the closed message is not contradicted. -->
					<div role="alert" class="rounded-md border border-destructive/30 bg-destructive/10 p-4">
						<h3 class="mb-1 font-semibold text-destructive">
							{m.reg_page_closed_title()}
						</h3>
						<p class="text-sm text-destructive/80">
							{m.reg_page_closed_message()}
						</p>
					</div>
				{:else}
					<h2 class="mb-4 text-xl font-semibold text-foreground">
						{m.reg_page_registration_section_title()}
					</h2>
					<!-- Registration form placeholder: Story 5.2 will add form fields here -->
					<!-- DO NOT add form fields in Story 5.1 scope -->
				{/if}
			</div>
		</div>
	</div>
</main>
