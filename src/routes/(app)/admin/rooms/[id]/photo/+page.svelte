<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import * as m from '$lib/paraglide/messages';

	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>{m.room_photo_upload_title()} — {data.room.name}</title>
</svelte:head>

<main class="mx-auto max-w-lg px-4 py-8">
	<h1 class="mb-6 text-2xl font-semibold tracking-tight text-foreground">
		{m.room_photo_upload_title()}
	</h1>

	<p class="mb-4 text-sm text-muted-foreground">{data.room.name}</p>

	<!-- Current photo -->
	<section class="mb-6" aria-labelledby="current-photo-heading">
		<h2 id="current-photo-heading" class="mb-2 text-sm font-medium text-foreground">
			{m.room_photo_current_label()}
		</h2>
		{#if data.room.photoPath}
			<img
				src="/rooms/{data.room.id}/photo"
				alt={data.room.name}
				class="h-48 w-full rounded-lg border border-border object-cover"
			/>
		{:else}
			<p class="text-sm text-muted-foreground">{m.room_photo_no_photo()}</p>
		{/if}
	</section>

	<!-- Error message -->
	{#if form?.error}
		<p class="mb-4 text-sm text-destructive" role="alert">{form.error}</p>
	{/if}

	<!-- Upload form -->
	<form method="POST" action="?/upload" enctype="multipart/form-data" class="flex flex-col gap-5">
		<div class="flex flex-col gap-1.5">
			<label for="photo" class="text-sm font-medium leading-none text-foreground">
				{m.room_photo_upload_label()}
			</label>
			<input
				id="photo"
				name="photo"
				type="file"
				accept="image/jpeg,image/png,image/webp"
				required
				class="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-medium hover:file:bg-muted/80"
			/>
			<p class="text-xs text-muted-foreground">{m.room_photo_upload_hint()}</p>
		</div>

		<div class="flex gap-3 pt-2">
			<a
				href={resolve('/admin/rooms' as Pathname)}
				class="flex h-11 flex-1 items-center justify-center rounded-md border border-border bg-background text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				{m.room_cancel_button()}
			</a>
			<button
				type="submit"
				class="flex h-11 flex-1 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
			>
				{m.room_photo_upload_button()}
			</button>
		</div>
	</form>
</main>
