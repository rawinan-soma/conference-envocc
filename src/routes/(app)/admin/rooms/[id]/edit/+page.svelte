<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { superForm } from 'sveltekit-superforms';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { ROOM_FEATURES } from '$lib/schemas/room';
	import * as m from '$lib/paraglide/messages';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, submitting } = superForm(data.form);
</script>

<svelte:head>
	<title>{m.room_edit_title()} — {data.room.name}</title>
</svelte:head>

<main class="mx-auto max-w-lg px-4 py-8">
	<h1 class="mb-6 text-2xl font-semibold tracking-tight text-foreground">
		{m.room_edit_title()}
	</h1>

	<form method="POST" action="?/update" use:enhance class="flex flex-col gap-5">
		<!-- Room name -->
		<div class="flex flex-col gap-1.5">
			<Label for="name">{m.room_name_label()}</Label>
			<Input
				id="name"
				name="name"
				type="text"
				bind:value={$form.name}
				class="h-11"
				aria-invalid={$errors.name ? true : undefined}
				aria-describedby={$errors.name ? 'name-error' : undefined}
			/>
			{#if $errors.name}
				<p id="name-error" class="text-xs text-destructive">{m.room_error_name_required()}</p>
			{/if}
		</div>

		<!-- Floor -->
		<div class="flex flex-col gap-1.5">
			<Label for="floor">{m.room_floor_label()}</Label>
			<Input
				id="floor"
				name="floor"
				type="text"
				bind:value={$form.floor}
				class="h-11"
				aria-invalid={$errors.floor ? true : undefined}
				aria-describedby={$errors.floor ? 'floor-error' : undefined}
			/>
			{#if $errors.floor}
				<p id="floor-error" class="text-xs text-destructive">{m.room_error_floor_required()}</p>
			{/if}
		</div>

		<!-- Capacity -->
		<div class="flex flex-col gap-1.5">
			<Label for="capacity">{m.room_capacity_label()}</Label>
			<Input
				id="capacity"
				name="capacity"
				type="number"
				min="1"
				bind:value={$form.capacity}
				class="h-11"
				aria-invalid={$errors.capacity ? true : undefined}
				aria-describedby={$errors.capacity ? 'capacity-error' : undefined}
			/>
			{#if $errors.capacity}
				<p id="capacity-error" class="text-xs text-destructive">{m.room_error_capacity_min()}</p>
			{/if}
		</div>

		<!-- Features multi-select (checkboxes) -->
		<fieldset>
			<legend class="mb-2 text-sm font-medium leading-none text-foreground">
				{m.room_features_label()}
			</legend>
			<div class="flex flex-wrap gap-4">
				{#each ROOM_FEATURES as feature (feature)}
					<label class="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							name="features"
							value={feature}
							checked={$form.features?.includes(feature)}
							onchange={(e) => {
								const checked = (e.target as HTMLInputElement).checked;
								if (checked) {
									$form.features = [...($form.features ?? []), feature];
								} else {
									$form.features = ($form.features ?? []).filter((f: string) => f !== feature);
								}
							}}
							class="h-4 w-4 rounded border-border"
						/>
						{feature === 'projector'
							? m.room_feature_projector()
							: feature === 'whiteboard'
								? m.room_feature_whiteboard()
								: m.room_feature_vc()}
					</label>
				{/each}
			</div>
		</fieldset>

		<div class="flex gap-3 pt-2">
			<a
				href={resolve('/admin/rooms' as Pathname)}
				class="flex h-11 flex-1 items-center justify-center rounded-md border border-border bg-background text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				{m.room_cancel_button()}
			</a>
			<Button type="submit" class="h-11 flex-1" disabled={$submitting}>
				{m.room_save_button()}
			</Button>
		</div>
	</form>
</main>
