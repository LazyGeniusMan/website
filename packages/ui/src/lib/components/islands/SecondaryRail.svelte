<script lang="ts">
	import type { Snippet } from "svelte";

	let { label = "Page actions", children }: { label?: string; children?: Snippet } = $props();
</script>

<div class="flex min-w-0 flex-col gap-4" data-slot="secondary-rail" aria-label={label}>
	{@render children?.()}
</div>
