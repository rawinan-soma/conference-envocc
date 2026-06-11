<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	let { data } = $props();
</script>

<main class="container mx-auto p-8">
	<Card>
		<CardHeader><CardTitle data-testid="skeleton-heading">{m.skeleton_title()}</CardTitle></CardHeader>
		<CardContent>
			<p>{m.skeleton_description()}</p>
			<p>
				{m.skeleton_insert_label()}: {data.conflict ? 'conflict (idempotent)' : data.insertedId}
			</p>
			{#if data.jobEnqueued}<p>{m.skeleton_job_label()}</p>{/if}
		</CardContent>
	</Card>
</main>
