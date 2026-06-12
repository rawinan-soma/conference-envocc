<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { superForm } from 'sveltekit-superforms';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as m from '$lib/paraglide/messages';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, submitting } = superForm(data.form);
</script>

<svelte:head>
	<title>{m.room_block_list_title()} — {data.room.name}</title>
</svelte:head>

<main class="mx-auto max-w-2xl px-4 py-8">
	<div class="mb-6 flex items-center gap-4">
		<a
			href={resolve('/admin/rooms' as Pathname)}
			class="text-sm text-muted-foreground hover:underline"
		>
			&larr; {m.room_list_title()}
		</a>
	</div>

	<h1 class="mb-2 text-2xl font-semibold tracking-tight text-foreground">
		{m.room_block_list_title()}
	</h1>
	<p class="mb-8 text-sm text-muted-foreground">{data.room.name}</p>

	<!-- Existing blocks list -->
	<section class="mb-10" aria-label="Existing time blocks">
		{#if data.blocks.length === 0}
			<p class="text-sm text-muted-foreground">{m.room_block_list_empty()}</p>
		{:else}
			<ul class="divide-y divide-border rounded-md border">
				{#each data.blocks as block (block.id)}
					<li class="flex items-center justify-between px-4 py-3">
						<div class="flex flex-col gap-0.5">
							<span class="text-sm font-medium">{block.during}</span>
							{#if block.reason}
								<span class="text-xs text-muted-foreground">{block.reason}</span>
							{/if}
						</div>
						<form method="POST" action="?/remove">
							<input type="hidden" name="blockId" value={block.id} />
							<Button type="submit" variant="destructive" size="sm">
								{m.room_block_delete_button()}
							</Button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Create block form -->
	<section aria-label="Create time block">
		<h2 class="mb-4 text-lg font-semibold">{m.room_block_create_title()}</h2>

		<form method="POST" action="?/create" use:enhance class="flex flex-col gap-5">
			<!-- Start -->
			<div class="flex flex-col gap-1.5">
				<Label for="startAt">{m.room_block_start_label()}</Label>
				<Input
					id="startAt"
					name="startAt"
					type="datetime-local"
					bind:value={$form.startAt}
					class="h-11"
					aria-invalid={$errors.startAt ? true : undefined}
					aria-describedby={$errors.startAt ? 'startAt-error' : undefined}
				/>
				{#if $errors.startAt}
					<p id="startAt-error" class="text-xs text-destructive">
						{m.room_block_validation_start_invalid()}
					</p>
				{/if}
			</div>

			<!-- End -->
			<div class="flex flex-col gap-1.5">
				<Label for="endAt">{m.room_block_end_label()}</Label>
				<Input
					id="endAt"
					name="endAt"
					type="datetime-local"
					bind:value={$form.endAt}
					class="h-11"
					aria-invalid={$errors.endAt ? true : undefined}
					aria-describedby={$errors.endAt ? 'endAt-error' : undefined}
				/>
				{#if $errors.endAt}
					<p id="endAt-error" class="text-xs text-destructive">
						{m.room_block_validation_end_invalid()}
					</p>
				{/if}
			</div>

			<!-- Reason (optional) -->
			<div class="flex flex-col gap-1.5">
				<Label for="reason">{m.room_block_reason_label()}</Label>
				<Input id="reason" name="reason" type="text" bind:value={$form.reason} class="h-11" />
			</div>

			<!-- Cross-field errors (end-after-start, conflict) -->
			{#if $errors._errors}
				{#each $errors._errors as err (err)}
					<p class="text-xs text-destructive">
						{#if err === 'room_block_conflict_booking'}
							{m.room_block_conflict_booking()}
						{:else if err === 'room_block_conflict_error'}
							{m.room_block_conflict_error()}
						{:else}
							{m.room_block_validation_end_after_start()}
						{/if}
					</p>
				{/each}
			{/if}

			<Button type="submit" disabled={$submitting} class="self-start">
				{$submitting ? '…' : m.room_block_create_button()}
			</Button>
		</form>
	</section>
</main>
