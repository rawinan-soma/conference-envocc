<script lang="ts">
	import { page } from '$app/state';

	import * as m from '$lib/paraglide/messages';

	const hasError = $derived(page.url.searchParams.get('error') === 'provider_unavailable');
</script>

<svelte:head>
	<title>{m.login_title()}</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-background">
	<div class="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-sm">
		<h1 class="mb-6 text-center text-2xl font-semibold tracking-tight text-foreground">
			{m.login_title()}
		</h1>

		{#if hasError}
			<p class="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
				{m.login_error_provider_unavailable()}
			</p>
		{/if}

		<!-- Posts to the page's default form action, which initiates the OIDC flow
		     server-side and redirects to Authentik. -->
		<form method="POST">
			<button
				type="submit"
				class="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				{m.login_sign_in_button()}
			</button>
		</form>
	</div>
</main>
