<script lang="ts">
	/**
	 * Resend a Lost Link page — Story 5.5
	 *
	 * Route: /r/[token]/resend
	 *
	 * This page is PUBLIC — no authentication required. It renders outside the (app)
	 * layout shell (no nav sidebar, no auth check). The /r prefix is already
	 * allow-listed in src/hooks.server.ts.
	 *
	 * Neutral acknowledgement (R-003 MITIGATE):
	 *   On success, always shows the same acknowledgement message — regardless of
	 *   whether a registration was found. The form/acknowledged state is driven by
	 *   result.data.acknowledged from the action, not by a found/not-found flag.
	 *
	 * AC Coverage:
	 *   AC-2: Single email field form, superform wired
	 *   AC-3 (R-003 MITIGATE): Same acknowledgement UI for found and not-found
	 *   AC-7: All UI strings via Paraglide (m.* calls); no Thai text in code
	 *
	 * Svelte 5 — uses $props() rune and $state/$derived patterns only.
	 */
	import { superForm } from 'sveltekit-superforms';
	import * as m from '$lib/paraglide/messages.js';
	import type { PageData } from './$types.js';

	const { data }: { data: PageData } = $props();

	let acknowledged = $state(false);

	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, submitting } = superForm(data.form, {
		dataType: 'form',
		onResult({ result }) {
			if (result.type === 'success' && result.data?.acknowledged) {
				acknowledged = true;
			}
		}
	});
</script>

<svelte:head>
	<title>{m.resend_page_title()} — {data.eventName}</title>
</svelte:head>

<main class="min-h-screen bg-background py-10">
	<div class="mx-auto max-w-2xl px-4">
		<!-- Org logo -->
		<div class="mb-8 flex justify-center">
			<img src="/logo.svg" alt="Organization logo" class="h-16 w-auto object-contain" />
		</div>

		<!-- Event name heading -->
		<h1 class="mb-6 text-center text-3xl font-bold text-foreground">
			{data.eventName}
		</h1>

		<div class="bg-card rounded-md border shadow-sm">
			<div class="p-6">
				{#if acknowledged}
					<!-- Acknowledged state (AC-3 / R-003 MITIGATE): same message for found and not-found -->
					<div role="status" aria-live="polite" class="text-center">
						<h2 class="mb-2 text-xl font-semibold text-foreground">
							{m.resend_form_acknowledged_title()}
						</h2>
						<p class="text-muted-foreground">
							{m.resend_form_acknowledged_message()}
						</p>
					</div>
				{:else}
					<!-- Resend form (AC-2) -->
					<h2 class="mb-2 text-xl font-semibold text-foreground">
						{m.resend_form_heading()}
					</h2>
					<p class="text-muted-foreground mb-4 text-sm">
						{m.resend_form_description()}
					</p>

					<form method="POST" action="?/resend" use:enhance class="space-y-4">
						<!-- Email field -->
						<div>
							<label for="email" class="mb-1 block text-sm font-medium text-foreground">
								{m.resend_form_email_label()}
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

						<!-- Submit button -->
						<div class="pt-2">
							<button
								type="submit"
								disabled={$submitting}
								class="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-ring w-full rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{$submitting ? m.resend_form_submitting_button() : m.resend_form_submit_button()}
							</button>
						</div>
					</form>
				{/if}
			</div>
		</div>
	</div>
</main>
