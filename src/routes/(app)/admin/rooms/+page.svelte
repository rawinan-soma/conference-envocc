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
	const { form, errors, enhance, submitting } = superForm(data.form, {
		resetForm: true
	});
</script>

<svelte:head>
	<title>{m.room_list_title()}</title>
</svelte:head>

<main class="mx-auto max-w-3xl px-4 py-8">
	<h1 class="mb-6 text-2xl font-semibold tracking-tight text-foreground">
		{m.room_list_title()}
	</h1>

	<!-- Room list -->
	{#if data.rooms.length === 0}
		<p class="mb-8 text-sm text-muted-foreground">{m.room_list_empty()}</p>
	{:else}
		<ul class="mb-8 divide-y divide-border rounded-lg border border-border bg-card">
			{#each data.rooms as room (room.id)}
				<li class="flex items-center justify-between px-4 py-3">
					<div>
						<p class="font-medium text-foreground">{room.name}</p>
						<p class="text-xs text-muted-foreground">
							{m.room_floor_label()}: {room.floor} &middot;
							{m.room_capacity_label()}: {room.capacity}
						</p>
					</div>
					<a
						href={resolve(`/admin/rooms/${room.id}/edit` as Pathname)}
						class="text-sm font-medium text-primary hover:underline focus-visible:underline focus-visible:outline-none"
					>
						{m.room_edit_title()}
					</a>
				</li>
			{/each}
		</ul>
	{/if}

	<!-- Create room form -->
	<section aria-labelledby="create-room-heading">
		<h2 id="create-room-heading" class="mb-4 text-lg font-semibold text-foreground">
			{m.room_create_title()}
		</h2>

		<form method="POST" action="?/create" use:enhance class="flex flex-col gap-5">
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
										const current = $form.features ?? [];
										$form.features = current.includes(feature) ? current : [...current, feature];
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

			<Button type="submit" class="mt-2 h-11 w-full" disabled={$submitting}>
				{m.room_create_button()}
			</Button>
		</form>
	</section>
</main>
