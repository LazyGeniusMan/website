<script lang="ts">
	import type { Component } from "svelte";
	import UserRoundIcon from "@lucide/svelte/icons/user-round";
	import BriefcaseIcon from "@lucide/svelte/icons/briefcase";
	import FolderIcon from "@lucide/svelte/icons/folder";
	import NewspaperIcon from "@lucide/svelte/icons/newspaper";
	import MailIcon from "@lucide/svelte/icons/mail";
	import { Button } from "$lib/components/ui/button/index.js";
	import { cn } from "$lib/utils.js";

	interface BottomLink {
		href: string;
		label: string;
		icon: Component;
	}

	let { currentPath = "/" }: { currentPath?: string } = $props();

	const links: BottomLink[] = [
		{ href: "/about", label: "About", icon: UserRoundIcon },
		{ href: "/projects", label: "Projects", icon: FolderIcon },
		{ href: "/blog", label: "Blog", icon: NewspaperIcon },
		{ href: "/contact", label: "Contact", icon: MailIcon },
	];

	const isActive = (href: string): boolean =>
		currentPath === href || currentPath.startsWith(`${href}/`);
</script>

<nav aria-label="Main" class="shell-bottom lg:hidden" data-slot="bottom-nav">
	<ul class="mx-auto grid max-w-2xl grid-cols-4 gap-0.5 px-2">
		{#each links as link (link.href)}
			{@const Icon = link.icon}
			<li class="min-w-0">
				<Button
					href={link.href}
					variant="ghost"
					aria-current={isActive(link.href) ? "page" : undefined}
					class={cn(
						"h-auto min-h-11 w-full min-w-0 flex-col gap-1 overflow-hidden rounded-none px-1 py-2 text-center text-[13px] leading-tight whitespace-nowrap",
						isActive(link.href) ? "text-foreground font-medium" : "text-muted-foreground",
					)}
				>
					<Icon data-icon="inline-start" aria-hidden="true" />
					<span class="block w-full min-w-0 truncate">{link.label}</span>
				</Button>
			</li>
		{/each}
	</ul>
</nav>
