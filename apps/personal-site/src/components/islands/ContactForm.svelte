<script lang="ts">
	import * as Alert from "$lib/components/ui/alert/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Field from "$lib/components/ui/field/index.js";
	import * as InputGroup from "$lib/components/ui/input-group/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import { Spinner } from "$lib/components/ui/spinner/index.js";
	import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";

	let { to = "website@yansyah.my.id" }: { to?: string } = $props();
	let name = $state("");
	let topic = $state("");
	let message = $state("");
	let submitted = $state(false);
	let sending = $state(false);
	const nameInvalid = $derived(submitted && name.trim() === "");
	const messageInvalid = $derived(submitted && message.trim() === "");
	const formInvalid = $derived(nameInvalid || messageInvalid);
	const subject = $derived(
		topic.trim() ? `[${topic.trim()}] Hello Yansyah` : "Hello Yansyah",
	);
	const composed = $derived(
		`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${message}\n\n– ${name}`)}`,
	);
	const PRESETS = ["Process improvement", "Systems & automation", "Accounting systems"];

	function send(event: SubmitEvent): void {
		event.preventDefault();
		submitted = true;
		if (formInvalid) return;
		sending = true;
		window.location.href = composed;
		window.setTimeout(() => {
			sending = false;
		}, 2000);
	}
</script>

<form
	onsubmit={send}
	class="flex flex-col gap-5"
	aria-label="Contact form"
	novalidate
>
	<Field.Group>
		<Field.Field data-invalid={nameInvalid || undefined}>
			<Field.Label for="contact-name">Your name</Field.Label>
			<InputGroup.Root class="rounded-none">
				<InputGroup.Input
					id="contact-name"
					name="name"
					type="text"
					required
					autocomplete="name"
					placeholder="How should I address you?"
					maxlength={120}
					bind:value={name}
					aria-invalid={nameInvalid || undefined}
				/>
			</InputGroup.Root>
			{#if nameInvalid}
				<Field.Error>Name is required.</Field.Error>
			{/if}
		</Field.Field>
		<Field.Field>
			<Field.Label for="contact-topic">Topic</Field.Label>
			<InputGroup.Root class="rounded-none">
				<InputGroup.Input
					id="contact-topic"
					name="topic"
					type="text"
					autocomplete="off"
					placeholder="Process, systems, automation"
					maxlength={80}
					bind:value={topic}
				/>
			</InputGroup.Root>
			<Field.Description>
				Pick a preset or type your own. It becomes the email subject prefix.
			</Field.Description>
			<ToggleGroup.Root
				type="single"
				value={topic === "" ? undefined : topic}
				onValueChange={(v) => {
					topic = v ?? "";
				}}
				variant="outline"
				spacing={2}
				aria-label="Topic presets"
				class="rounded-none flex-wrap justify-start"
			>
				{#each PRESETS as preset (preset)}
					<ToggleGroup.Item value={preset} aria-label={preset} class="rounded-none">
						{preset}
					</ToggleGroup.Item>
				{/each}
			</ToggleGroup.Root>
		</Field.Field>
		<Field.Field data-invalid={messageInvalid || undefined}>
			<Field.Label for="contact-message">Message</Field.Label>
			<InputGroup.Root class="rounded-none">
				<InputGroup.Textarea
					id="contact-message"
					name="message"
					required
					rows={5}
					placeholder="What process, system, or automation should we talk about?"
					maxlength={2000}
					bind:value={message}
					aria-invalid={messageInvalid || undefined}
				/>
			</InputGroup.Root>
			{#if messageInvalid}
				<Field.Error>Message is required.</Field.Error>
			{:else}
				<Field.Description>
					One concrete engagement beats a general hello. Name one from this page.
				</Field.Description>
			{/if}
		</Field.Field>
	</Field.Group>
	<p class="text-base opacity-80" aria-live="polite" id="contact-subject-preview">
		Subject preview: <span class="font-medium tabular-nums">{subject}</span>
	</p>
	{#if submitted && formInvalid}
		<Alert.Root variant="destructive" class="rounded-none">
			<Alert.Title>Check the highlighted fields</Alert.Title>
			<Alert.Description>
				{#if nameInvalid}Add your name. {/if}{#if messageInvalid}Write a short
					message. {/if}Then choose Compose email again.
			</Alert.Description>
		</Alert.Root>
	{/if}
	<Separator />
	<div>
		<Button type="submit" class="min-h-11 rounded-none" disabled={sending}>
			{#if sending}
				<Spinner data-icon="inline-start" />
			{/if}
			Compose email
		</Button>
	</div>
	<p class="text-base opacity-80">
		This opens your mail app addressed to {to}. Nothing is sent automatically.
	</p>
</form>
