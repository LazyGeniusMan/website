<script lang="ts">
	import type { Snippet } from "svelte";

	let { label = "Page options", children }: { label?: string; children?: Snippet } = $props();
</script>

<section class="flex min-w-0 flex-col gap-4" data-slot="secondary-rail" aria-label={label}>
	{@render children?.()}
</section>
