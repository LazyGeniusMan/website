<script lang="ts">
	import type { Component } from "svelte";
	import UserRoundIcon from "@lucide/svelte/icons/user-round";
	import BriefcaseIcon from "@lucide/svelte/icons/briefcase";
	import FolderIcon from "@lucide/svelte/icons/folder";
	import NewspaperIcon from "@lucide/svelte/icons/newspaper";
	import MailIcon from "@lucide/svelte/icons/mail";
	import { Button } from "$lib/components/ui/button/index.js";
	import { cn } from "$lib/utils.js";

	interface SideLink {
		href: string;
		label: string;
		icon: Component;
	}

	let { currentPath = "/" }: { currentPath?: string } = $props();

	const links: SideLink[] = [
		{ href: "/about", label: "About", icon: UserRoundIcon },
		{ href: "/projects", label: "Projects", icon: FolderIcon },
		{ href: "/blog", label: "Blog", icon: NewspaperIcon },
		{ href: "/contact", label: "Contact", icon: MailIcon },
	];

	const isActive = (href: string): boolean =>
		currentPath === href || currentPath.startsWith(`${href}/`);

</script>

<div class="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-5 overflow-hidden px-4 py-6" data-slot="side-nav">
	<a href="/" class="display shrink-0 px-3 text-3xl" aria-label="Andriyansyah Nurrachman — home"> Yansyah </a>
	<nav aria-label="Primary" class="min-h-0 shrink-0">
		<ul class="flex flex-col gap-1">
			{#each links as link (link.href)}
				{@const Icon = link.icon}
				<li>
					<Button
						href={link.href}
						variant="ghost"
						aria-current={isActive(link.href) ? "page" : undefined}
						class={cn(
							"min-h-11 w-full justify-start gap-3 rounded-none px-3 text-lg",
							isActive(link.href) ? "text-foreground font-medium" : "text-muted-foreground",
						)}
					>
						<Icon data-icon="inline-start" aria-hidden="true" />
						{link.label}
					</Button>
				</li>
			{/each}
		</ul>
	</nav>
</div>
