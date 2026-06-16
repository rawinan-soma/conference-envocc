<script lang="ts">
	/**
	 * Public Registration Page — Story 5.1, Story 5.2
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
	 *   Story 5.2:
	 *   AC-1: Form fields rendered when registrationEnabled=true
	 *   AC-2: Conditional meal type selector when cateringEnabled=true
	 *   AC-4: On success, hide form and show confirmation message
	 *   AC-5 (NFR-004): Responsive at 375×667px and 1280×800px
	 *   AC-7: All UI strings via Paraglide
	 *
	 * Svelte 5 — uses $props() rune and $state/$derived patterns only (no Svelte 4 reactivity).
	 */
	import { superForm } from 'sveltekit-superforms';
	import * as m from '$lib/paraglide/messages.js';
	import type { PageData } from './$types.js';

	const { data }: { data: PageData } = $props();

	let successState = $state(false);

	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, submitting } = superForm(data.form, {
		dataType: 'form', // standard form submission (not JSON)
		onResult({ result }) {
			if (result.type === 'success') {
				successState = true;
			}
		}
	});
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
				{:else if successState}
					<!-- Success state (AC-4): form hidden, confirmation shown -->
					<div role="status" aria-live="polite" class="text-center">
						<h3 class="mb-2 text-xl font-semibold text-foreground">
							{m.reg_form_success_title()}
						</h3>
						<p class="text-muted-foreground">
							{m.reg_form_success_message()}
						</p>
					</div>
				{:else}
					<h2 class="mb-4 text-xl font-semibold text-foreground">
						{m.reg_page_registration_section_title()}
					</h2>

					<!-- Registration form (Story 5.2 — AC-1, AC-2, AC-5, AC-7) -->
					<form method="POST" action="?/register" use:enhance class="space-y-4">
						<!-- Hidden field for cateringEnabled (server schema validation cross-check) -->
						<input
							type="hidden"
							name="cateringEnabled"
							value={data.cateringEnabled ? 'true' : 'false'}
						/>

						<!-- Title selector (AC-1) -->
						<div>
							<label for="title" class="mb-1 block text-sm font-medium text-foreground">
								{m.reg_form_title_label()}
								<span class="text-destructive" aria-hidden="true">*</span>
							</label>
							<select
								id="title"
								name="title"
								bind:value={$form.title}
								required
								class="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
							>
								<option value="">{m.reg_form_title_placeholder()}</option>
								<option value="Mr">{m.reg_form_title_mr()}</option>
								<option value="Mrs">{m.reg_form_title_mrs()}</option>
								<option value="Ms">{m.reg_form_title_ms()}</option>
								<option value="Other">{m.reg_form_title_other()}</option>
							</select>
							{#if $errors.title}
								<span class="mt-1 text-sm text-destructive">{$errors.title}</span>
							{/if}
						</div>

						<!-- Title Other free text (conditional — only when title = 'Other') -->
						{#if $form.title === 'Other'}
							<div>
								<label for="titleOtherText" class="mb-1 block text-sm font-medium text-foreground">
									{m.reg_form_title_other_label()}
									<span class="text-destructive" aria-hidden="true">*</span>
								</label>
								<input
									id="titleOtherText"
									name="titleOtherText"
									type="text"
									bind:value={$form.titleOtherText}
									class="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
								/>
								{#if $errors.titleOtherText}
									<span class="mt-1 text-sm text-destructive">{$errors.titleOtherText}</span>
								{/if}
							</div>
						{/if}

						<!-- First name (AC-1) -->
						<div>
							<label for="firstName" class="mb-1 block text-sm font-medium text-foreground">
								{m.reg_form_first_name_label()}
								<span class="text-destructive" aria-hidden="true">*</span>
							</label>
							<input
								id="firstName"
								name="firstName"
								type="text"
								bind:value={$form.firstName}
								required
								class="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
							/>
							{#if $errors.firstName}
								<span class="mt-1 text-sm text-destructive">{$errors.firstName}</span>
							{/if}
						</div>

						<!-- Last name (AC-1) -->
						<div>
							<label for="lastName" class="mb-1 block text-sm font-medium text-foreground">
								{m.reg_form_last_name_label()}
								<span class="text-destructive" aria-hidden="true">*</span>
							</label>
							<input
								id="lastName"
								name="lastName"
								type="text"
								bind:value={$form.lastName}
								required
								class="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
							/>
							{#if $errors.lastName}
								<span class="mt-1 text-sm text-destructive">{$errors.lastName}</span>
							{/if}
						</div>

						<!-- Organization (AC-1) -->
						<div>
							<label for="organization" class="mb-1 block text-sm font-medium text-foreground">
								{m.reg_form_organization_label()}
								<span class="text-destructive" aria-hidden="true">*</span>
							</label>
							<input
								id="organization"
								name="organization"
								type="text"
								bind:value={$form.organization}
								required
								class="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
							/>
							{#if $errors.organization}
								<span class="mt-1 text-sm text-destructive">{$errors.organization}</span>
							{/if}
						</div>

						<!-- Email (AC-1) -->
						<div>
							<label for="email" class="mb-1 block text-sm font-medium text-foreground">
								{m.reg_form_email_label()}
								<span class="text-destructive" aria-hidden="true">*</span>
							</label>
							<input
								id="email"
								name="email"
								type="email"
								bind:value={$form.email}
								required
								class="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
							/>
							{#if $errors.email}
								<span class="mt-1 text-sm text-destructive">{$errors.email}</span>
							{/if}
						</div>

						<!-- Conditional meal type (AC-2 — only when cateringEnabled) -->
						{#if data.cateringEnabled}
							<div>
								<label for="mealType" class="mb-1 block text-sm font-medium text-foreground">
									{m.reg_form_meal_label()}
									<span class="text-destructive" aria-hidden="true">*</span>
								</label>
								<select
									id="mealType"
									name="mealType"
									bind:value={$form.mealType}
									class="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
								>
									<option value="">{m.reg_form_meal_placeholder()}</option>
									<option value="Normal">{m.reg_form_meal_normal()}</option>
									<option value="Vegetarian">{m.reg_form_meal_vegetarian()}</option>
									<option value="Muslim">{m.reg_form_meal_muslim()}</option>
									<option value="Other">{m.reg_form_meal_other()}</option>
								</select>
								{#if $errors.mealType}
									<span class="mt-1 text-sm text-destructive">{$errors.mealType}</span>
								{/if}
							</div>

							<!-- Meal type other text (conditional — only when mealType = 'Other') -->
							{#if $form.mealType === 'Other'}
								<div>
									<label
										for="mealTypeOtherText"
										class="mb-1 block text-sm font-medium text-foreground"
									>
										{m.reg_form_meal_other_label()}
										<span class="text-destructive" aria-hidden="true">*</span>
									</label>
									<input
										id="mealTypeOtherText"
										name="mealTypeOtherText"
										type="text"
										bind:value={$form.mealTypeOtherText}
										class="border-input bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
									/>
									{#if $errors.mealTypeOtherText}
										<span class="mt-1 text-sm text-destructive">{$errors.mealTypeOtherText}</span>
									{/if}
								</div>
							{/if}
						{/if}

						<!-- Submit button -->
						<div class="pt-2">
							<button
								type="submit"
								disabled={$submitting}
								class="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-ring w-full rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{$submitting ? m.reg_form_submitting_button() : m.reg_form_submit_button()}
							</button>
						</div>
					</form>
				{/if}
			</div>
		</div>
	</div>
</main>
