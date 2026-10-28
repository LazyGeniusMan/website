<script lang="ts">
	import { onMount } from "svelte";
	import { Toaster as SonnerToaster } from "$lib/components/ui/sonner/index.js";
	import { bootTheme, theme, type ThemeMode } from "$lib/stores/theme.js";

	let mode = $state<ThemeMode>("system");
	let osDark = $state(false);

	onMount(() => {
		mode = bootTheme();
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const syncOs = (event?: MediaQueryListEvent): void => {
			osDark = event ? event.matches : mq.matches;
		};
		syncOs();
		const unsubscribe = theme.subscribe((next) => {
			mode = next;
		});
		if (typeof mq.addEventListener === "function") {
			mq.addEventListener("change", syncOs);
			return () => {
				unsubscribe();
				mq.removeEventListener("change", syncOs);
			};
		}
		return unsubscribe;
	});

	const effective = $derived(mode === "dark" || (mode === "system" && osDark) ? "dark" : "light");
</script>

<SonnerToaster theme={effective} position="bottom-center" />
