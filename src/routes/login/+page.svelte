<script lang="ts">
	import * as m from '$lib/paraglide/messages';
</script>

<svelte:head>
	<title>{m.login_title()}</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-background">
	<div class="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-sm">
		<h1 class="mb-6 text-center text-2xl font-semibold tracking-tight text-foreground">
			{m.login_title()}
		</h1>

		<form method="POST" action="/auth/sign-in/oauth2">
			<input type="hidden" name="providerId" value="authentik" />
			<input type="hidden" name="callbackURL" value="/" />

			<button
				type="submit"
				class="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				{m.login_sign_in_button()}
			</button>
		</form>
	</div>
</main>
