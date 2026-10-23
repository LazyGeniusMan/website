<script lang="ts">
	import type { Snippet } from "svelte";
	import SlidersHorizontalIcon from "@lucide/svelte/icons/sliders-horizontal";
	import { Button } from "$lib/components/ui/button/index.js";
	import {
		Drawer,
		DrawerContent,
		DrawerDescription,
		DrawerTitle,
		DrawerTrigger,
	} from "$lib/components/ui/drawer/index.js";

	let { label = "Page options", children }: { label?: string; children?: Snippet } = $props();

	let open = $state(false);
</script>

<div class="shell-fab xl:hidden" data-slot="fab-drawer">
	<Drawer bind:open>
		<DrawerTrigger>
			{#snippet child({ props })}
				<Button
					variant="default"
					size="icon-lg"
					{...props}
					aria-label={label}
					class="size-11 rounded-none"
				>
					<SlidersHorizontalIcon data-icon="inline-start" />
				</Button>
			{/snippet}
		</DrawerTrigger>
		<DrawerContent class="rounded-none">
			<div class="px-6 pt-6">
				<DrawerTitle class="text-left text-lg">{label}</DrawerTitle>
				<DrawerDescription class="sr-only">Page actions</DrawerDescription>
			</div>
			<div class="max-h-[70svh] overflow-y-auto px-6 py-4">
				<div class="flex flex-col gap-4">
					{@render children?.()}
				</div>
			</div>
		</DrawerContent>
	</Drawer>
</div>
