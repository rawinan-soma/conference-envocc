<script lang="ts">
	/**
	 * Self-Cancel Registration Page — Story 5.4
	 *
	 * Route: /r/[token]/cancel?token=<cancelTokenPlain>
	 *
	 * PUBLIC — no authentication required. Uses same shell as /r/[token] (no auth sidebar).
	 * The cancel token is passed via a hidden form input on POST — never displayed to the user.
	 *
	 * AC Coverage:
	 *   AC-1 (FR-044): Shows confirmation prompt; POST cancels; success state shown after confirm
	 *   AC-2: form?.success === false covers both invalid and already-cancelled cases
	 *   AC-3: No registrationId in UI — security is entirely in the server/service layer
	 *   AC-4: error state on invalid/missing token (rendered by server error(400) or form result)
	 *   AC-5: all strings via m.* Paraglide calls; no Thai text in code
	 *   AC-6 (NFR-007): role="alert" on error/success containers; semantic HTML
	 *
	 * Svelte 5 — uses $props() rune only (no Svelte 4 reactivity).
	 */
	import * as m from '$lib/paraglide/messages.js';
	import type { PageData, ActionData } from './$types.js';

	const { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>{m.reg_cancel_page_title()}</title>
</svelte:head>

<main class="min-h-screen bg-background py-10">
	<div class="mx-auto max-w-2xl px-4">
		<!-- Org logo — static/logo.svg provided at deployment time -->
		<div class="mb-8 flex justify-center">
			<img src="/logo.svg" alt="Organization logo" class="h-16 w-auto object-contain" />
		</div>

		<div class="bg-card rounded-md border shadow-sm">
			<div class="p-8">
				{#if form?.success === true}
					<!-- Success state (AC-1, AC-6) -->
					<div role="alert" class="text-center">
						<h1 class="mb-3 text-2xl font-bold text-foreground">
							{m.reg_cancel_success_title()}
						</h1>
						<p class="text-muted-foreground">
							{m.reg_cancel_success_message()}
						</p>
					</div>
				{:else if form?.success === false}
					<!-- Error state — invalid or already-used token (AC-2, AC-4, AC-6) -->
					<div role="alert" class="text-center">
						<h1 class="mb-3 text-2xl font-bold text-foreground">
							{m.reg_cancel_error_title()}
						</h1>
						<p class="text-muted-foreground">
							{m.reg_cancel_error_message()}
						</p>
					</div>
				{:else}
					<!-- Default state: confirmation prompt (AC-1) -->
					<div class="text-center">
						<h1 class="mb-3 text-2xl font-bold text-foreground">
							{m.reg_cancel_confirm_heading()}
						</h1>
						<p class="text-muted-foreground mb-6">
							{m.reg_cancel_confirm_body()}
						</p>

						<!-- Plain SvelteKit form action — no superForm needed (story spec) -->
						<form method="POST">
							<!-- Hidden input carries the cancel token to the POST action (AC-3) -->
							<input type="hidden" name="token" value={data.cancelTokenPlain} />
							<button
								type="submit"
								class="bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex items-center justify-center rounded-md px-6 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							>
								{m.reg_cancel_confirm_button()}
							</button>
						</form>
					</div>
				{/if}
			</div>
		</div>
	</div>
</main>
