<script lang="ts">
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import { onMount } from "svelte";
	import * as Collapsible from "$lib/components/ui/collapsible/index.js";
	import { cn } from "$lib/utils.js";

	interface TocItem {
		id: string;
		label: string;
		depth?: number;
	}

	let {
		items = [],
		label = "On this page"
	}: {
		items?: TocItem[];
		label?: string;
	} = $props();

	let activeId = $state<string | null>(null);

	onMount(() => {
		const targets = items
			.map((item) => document.getElementById(item.id))
			.filter((el): el is HTMLElement => el !== null);
		if (targets.length === 0) return;
		if (!("IntersectionObserver" in window)) return;
		const order = new Map(items.map((item, index) => [item.id, index]));
		const io = new IntersectionObserver(
			(entries) => {
				const visible = entries.filter((entry) => entry.isIntersecting);
				if (visible.length === 0) return;
				// Deterministic when several sections share the band: last in
				// document order wins (matches scrolling down through sections).
				visible.sort(
					(a, b) =>
						(order.get((a.target as HTMLElement).id) ?? 0) -
						(order.get((b.target as HTMLElement).id) ?? 0),
				);
				activeId = (visible[visible.length - 1].target as HTMLElement).id;
			},
			{ rootMargin: "-40% 0px -55% 0px" }
		);
		for (const el of targets) io.observe(el);
		return () => io.disconnect();
	});
</script>

<Collapsible.Root open data-slot="toc-nav" class="group/toc-nav flex min-w-0 flex-col">
	<Collapsible.Trigger
		class="text-foreground flex min-h-11 w-full items-center justify-between gap-2 text-lg font-medium"
		aria-label={`Toggle ${label}`}
	>
		{label}
		<ChevronDownIcon
			data-icon="inline-end"
			aria-hidden="true"
			class="transition-transform group-data-[state=open]/toc-nav:rotate-180"
		/>
	</Collapsible.Trigger>
	<Collapsible.Content class="pt-2">
		<nav aria-label={label}>
			<ul class="flex flex-col gap-2 text-lg">
				{#each items as item (item.id)}
					{@const active = activeId === item.id}
					<li class={cn(item.depth === 3 && "pl-4")}>
						<a
							href={`#${item.id}`}
							aria-current={active ? "location" : undefined}
							class={cn(
								"inline-flex min-h-11 items-center underline-offset-4 hover:underline",
								active ? "text-foreground font-semibold underline" : "text-muted-foreground"
							)}
						>
							{item.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	</Collapsible.Content>
</Collapsible.Root>
