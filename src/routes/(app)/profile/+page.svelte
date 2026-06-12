<script lang="ts">
	import { superForm } from 'sveltekit-superforms';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as m from '$lib/paraglide/messages';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let savedSuccess = $state(false);

	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, submitting } = superForm(data.form, {
		onResult({ result }) {
			if (result.type === 'success') {
				savedSuccess = true;
				setTimeout(() => {
					savedSuccess = false;
				}, 3000);
			}
		}
	});
</script>

<svelte:head>
	<title>{m.profile_edit_title()}</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-background">
	<div class="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-sm">
		<h1 class="mb-6 text-center text-2xl font-semibold tracking-tight text-foreground">
			{m.profile_edit_title()}
		</h1>

		{#if savedSuccess}
			<div
				role="status"
				aria-live="polite"
				class="mb-5 rounded-md border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800"
			>
				{m.profile_saved_toast()}
			</div>
		{/if}

		<form method="POST" use:enhance class="flex flex-col gap-5">
			<!-- Email (read-only) -->
			<div class="flex flex-col gap-1.5">
				<Label for="email">{m.profile_email_label()}</Label>
				<Input
					id="email"
					type="email"
					value={data.email}
					disabled
					class="h-11 cursor-not-allowed opacity-60"
				/>
				<p class="text-xs text-muted-foreground">{m.profile_email_readonly_hint()}</p>
			</div>

			<!-- Title (native select — styled to match shadcn Input) -->
			<div class="flex flex-col gap-1.5">
				<Label for="title">{m.profile_title_label()}</Label>
				<select
					id="title"
					name="title"
					bind:value={$form.title}
					class="border-input bg-background ring-offset-background focus-visible:ring-ring h-11 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					aria-invalid={$errors.title ? true : undefined}
				>
					<option value="" disabled hidden selected>{m.profile_title_label()}</option>
					<option value="Mr.">{m.profile_title_mr()}</option>
					<option value="Mrs.">{m.profile_title_mrs()}</option>
					<option value="Ms.">{m.profile_title_ms()}</option>
					<option value="Other">{m.profile_title_other()}</option>
				</select>
				{#if $errors.title}
					<p class="text-xs text-destructive">{m.profile_error_required()}</p>
				{/if}
			</div>

			<!-- First name -->
			<div class="flex flex-col gap-1.5">
				<Label for="firstName">{m.profile_first_name_label()}</Label>
				<Input
					id="firstName"
					name="firstName"
					type="text"
					bind:value={$form.firstName}
					class="h-11"
					aria-invalid={$errors.firstName ? true : undefined}
				/>
				{#if $errors.firstName}
					<p class="text-xs text-destructive">{m.profile_error_first_name_required()}</p>
				{/if}
			</div>

			<!-- Last name -->
			<div class="flex flex-col gap-1.5">
				<Label for="lastName">{m.profile_last_name_label()}</Label>
				<Input
					id="lastName"
					name="lastName"
					type="text"
					bind:value={$form.lastName}
					class="h-11"
					aria-invalid={$errors.lastName ? true : undefined}
				/>
				{#if $errors.lastName}
					<p class="text-xs text-destructive">{m.profile_error_last_name_required()}</p>
				{/if}
			</div>

			<!-- Phone -->
			<div class="flex flex-col gap-1.5">
				<Label for="phone">{m.profile_phone_label()}</Label>
				<Input
					id="phone"
					name="phone"
					type="tel"
					bind:value={$form.phone}
					class="h-11"
					aria-invalid={$errors.phone ? true : undefined}
				/>
				{#if $errors.phone}
					<p class="text-xs text-destructive">{m.profile_error_phone_required()}</p>
				{/if}
			</div>

			<!-- Organization -->
			<div class="flex flex-col gap-1.5">
				<Label for="organization">{m.profile_organization_label()}</Label>
				<Input
					id="organization"
					name="organization"
					type="text"
					bind:value={$form.organization}
					class="h-11"
					aria-invalid={$errors.organization ? true : undefined}
				/>
				{#if $errors.organization}
					<p class="text-xs text-destructive">{m.profile_error_organization_required()}</p>
				{/if}
			</div>

			<!-- Submit -->
			<Button type="submit" class="mt-2 h-11 w-full" disabled={$submitting}>
				{m.profile_save_button()}
			</Button>
		</form>
	</div>
</main>
