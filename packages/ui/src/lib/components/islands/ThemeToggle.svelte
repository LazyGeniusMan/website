<script lang="ts">
	import MonitorIcon from "@lucide/svelte/icons/monitor";
	import MoonIcon from "@lucide/svelte/icons/moon";
	import SunIcon from "@lucide/svelte/icons/sun";
	import { onMount } from "svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
	import { bootTheme, setTheme, theme, type ThemeMode } from "$lib/stores/theme.js";

	function domMode(): ThemeMode {
		try {
			const saved = localStorage.getItem("yansyah-theme");
			if (saved === "light" || saved === "dark" || saved === "system") return saved;
		} catch {
			// Fall through to system default when storage is unavailable.
		}
		return "system";
	}

	// Read the preference the inline boot script already applied so the label
	// is correct on first paint and both instances (rail + drawer) agree.
	let mode = $state<ThemeMode>(typeof document === "undefined" ? "system" : domMode());

	function select(value: string | undefined): void {
		if (value === "light" || value === "dark" || value === "system") setTheme(value);
	}

	const order: ThemeMode[] = ["light", "dark", "system"];

	function cycle(): void {
		const next = order[(order.indexOf(mode) + 1) % order.length];
		setTheme(next ?? "system");
	}

	onMount(() => {
		mode = bootTheme();
		return theme.subscribe((next) => {
			mode = next;
		});
	});
</script>

<div data-slot="theme-toggle" class="w-full min-w-0 max-w-full">
	<ToggleGroup.Root
		type="single"
		value={mode}
		onValueChange={select}
		variant="outline"
		aria-label="Color theme"
		class="grid min-h-11 w-full min-w-0 max-w-full grid-cols-3 rounded-none max-lg:hidden"
	>
		<ToggleGroup.Item value="light" aria-label="Light theme" class="min-w-0 justify-center rounded-none px-1">
			<SunIcon data-icon="inline-start" aria-hidden="true" />
			Light
		</ToggleGroup.Item>
		<ToggleGroup.Item value="dark" aria-label="Dark theme" class="min-w-0 justify-center rounded-none px-1">
			<MoonIcon data-icon="inline-start" aria-hidden="true" />
			Dark
		</ToggleGroup.Item>
		<ToggleGroup.Item value="system" aria-label="System theme" class="min-w-0 justify-center rounded-none px-1">
			<MonitorIcon data-icon="inline-start" aria-hidden="true" />
			System
		</ToggleGroup.Item>
	</ToggleGroup.Root>
	<Button
		type="button"
		variant="outline"
		onclick={cycle}
		aria-label={`Theme: ${mode}, activate to switch theme`}
		data-mode={mode}
		class="min-h-11 rounded-none lg:hidden"
	>
		{#if mode === "light"}
			<SunIcon data-icon="inline-start" aria-hidden="true" />
			Light
		{:else if mode === "dark"}
			<MoonIcon data-icon="inline-start" aria-hidden="true" />
			Dark
		{:else}
			<MonitorIcon data-icon="inline-start" aria-hidden="true" />
			System
		{/if}
	</Button>
</div>
