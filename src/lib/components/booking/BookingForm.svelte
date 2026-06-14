<script lang="ts">
	import type { Writable, Readable } from 'svelte/store';
	import type { BookingInput } from '$lib/schemas/booking.js';
	import type { Room } from '$lib/server/db/schema/rooms.js';
	import type { UserProfile } from '$lib/server/db/schema/profiles.js';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		form: Writable<BookingInput>;
		errors: Writable<Partial<Record<keyof BookingInput | '_errors', string[]>>>;
		enhance: (el: HTMLFormElement) => { destroy(): void };
		submitting: Readable<boolean>;
		rooms: Room[];
		userProfile: UserProfile | null;
	}

	let { form, errors, enhance, submitting, rooms, userProfile }: Props = $props();
</script>

<form method="POST" action="?/create" use:enhance class="flex flex-col gap-5">
	<!-- Room selector -->
	<div class="flex flex-col gap-1.5">
		<Label for="roomId">{m.booking_room_label()}</Label>
		<select
			id="roomId"
			name="roomId"
			bind:value={$form.roomId}
			class="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
			aria-invalid={$errors.roomId ? true : undefined}
			aria-describedby={$errors.roomId ? 'roomId-error' : undefined}
		>
			<option value="">— {m.booking_room_label()} —</option>
			{#each rooms as room (room.id)}
				<option value={room.id}
					>{room.name} — {m.calendar_room_floor_prefix({ floor: String(room.floor) })}</option
				>
			{/each}
		</select>
		{#if $errors.roomId}
			<p id="roomId-error" class="text-xs text-destructive">
				{m.booking_room_required()}
			</p>
		{/if}
	</div>

	<!-- Event name -->
	<div class="flex flex-col gap-1.5">
		<Label for="eventName">{m.booking_event_name_label()}</Label>
		<Input
			id="eventName"
			name="eventName"
			type="text"
			bind:value={$form.eventName}
			class="h-11"
			aria-invalid={$errors.eventName ? true : undefined}
			aria-describedby={$errors.eventName ? 'eventName-error' : undefined}
		/>
		{#if $errors.eventName}
			<p id="eventName-error" class="text-xs text-destructive">
				{m.booking_event_name_required()}
			</p>
		{/if}
	</div>

	<!-- Start datetime -->
	<div class="flex flex-col gap-1.5">
		<Label for="startAt">{m.booking_start_label()}</Label>
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
			<p id="startAt-error" class="text-xs text-destructive">{$errors.startAt[0]}</p>
		{/if}
	</div>

	<!-- End datetime -->
	<div class="flex flex-col gap-1.5">
		<Label for="endAt">{m.booking_end_label()}</Label>
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
			<p id="endAt-error" class="text-xs text-destructive">{$errors.endAt[0]}</p>
		{/if}
	</div>

	<!-- Cross-field time errors -->
	{#if $errors._errors}
		{#each $errors._errors as err (err)}
			<p class="text-xs text-destructive">
				{#if err === 'booking_conflict_error'}
					{m.booking_conflict_error()}
				{:else}
					{m.booking_validation_end_after_start()}
				{/if}
			</p>
		{/each}
	{/if}

	<!-- Agenda (optional) -->
	<div class="flex flex-col gap-1.5">
		<Label for="agenda">{m.booking_agenda_label()}</Label>
		<textarea
			id="agenda"
			name="agenda"
			bind:value={$form.agenda}
			rows="3"
			class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
		></textarea>
	</div>

	<!-- Catering toggle -->
	<div class="flex items-center gap-3">
		<input
			id="cateringEnabled"
			name="cateringEnabled"
			type="checkbox"
			bind:checked={$form.cateringEnabled}
			class="h-4 w-4 rounded border-input accent-primary"
		/>
		<div class="flex flex-col gap-0.5">
			<Label for="cateringEnabled">{m.booking_catering_label()}</Label>
			<span class="text-xs text-muted-foreground">{m.booking_catering_hint()}</span>
		</div>
	</div>

	<!-- Registration toggle -->
	<div class="flex items-center gap-3">
		<input
			id="registrationEnabled"
			name="registrationEnabled"
			type="checkbox"
			bind:checked={$form.registrationEnabled}
			class="h-4 w-4 rounded border-input accent-primary"
		/>
		<div class="flex flex-col gap-0.5">
			<Label for="registrationEnabled">{m.booking_registration_label()}</Label>
			<span class="text-xs text-muted-foreground">{m.booking_registration_hint()}</span>
		</div>
	</div>

	<!-- Registration closing date (conditional) -->
	{#if $form.registrationEnabled}
		<div class="flex flex-col gap-1.5 pl-7">
			<Label for="registrationClosesAt">{m.booking_registration_closes_label()}</Label>
			<Input
				id="registrationClosesAt"
				name="registrationClosesAt"
				type="datetime-local"
				bind:value={$form.registrationClosesAt}
				class="h-11"
				aria-invalid={$errors.registrationClosesAt ? true : undefined}
				aria-describedby={$errors.registrationClosesAt ? 'registrationClosesAt-error' : undefined}
			/>
			{#if $errors.registrationClosesAt}
				<p id="registrationClosesAt-error" class="text-xs text-destructive">
					{m.booking_registration_closes_required()}
				</p>
			{/if}
		</div>
	{/if}

	<!-- Contact section (read-only) -->
	{#if userProfile}
		<section
			aria-label={m.booking_contact_section_label()}
			class="rounded-md border border-border p-4 bg-muted/40"
		>
			<h2 class="mb-1 text-sm font-semibold">{m.booking_contact_section_label()}</h2>
			<p class="mb-3 text-xs text-muted-foreground">{m.booking_contact_readonly_hint()}</p>
			<div class="grid grid-cols-2 gap-2 text-sm">
				<div>
					<span class="text-xs text-muted-foreground">{m.booking_contact_name_label()}</span>
					<p class="font-medium">{userProfile.firstName} {userProfile.lastName}</p>
				</div>
				{#if userProfile.title}
					<div>
						<span class="text-xs text-muted-foreground">{m.booking_contact_title_label()}</span>
						<p class="font-medium">{userProfile.title}</p>
					</div>
				{/if}
				<div>
					<span class="text-xs text-muted-foreground">{m.booking_contact_email_label()}</span>
					<p class="font-medium">{userProfile.email}</p>
				</div>
				<div>
					<span class="text-xs text-muted-foreground">{m.booking_contact_phone_label()}</span>
					<p class="font-medium">{userProfile.phone}</p>
				</div>
				<div class="col-span-2">
					<span class="text-xs text-muted-foreground">{m.booking_contact_org_label()}</span>
					<p class="font-medium">{userProfile.organization}</p>
				</div>
			</div>
		</section>
	{/if}

	<!-- Submit -->
	<Button type="submit" disabled={$submitting} class="self-start">
		{$submitting ? '…' : m.booking_submit_button()}
	</Button>
</form>
