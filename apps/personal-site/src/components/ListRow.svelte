<script lang="ts">
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { cn } from "$lib/utils.js";
  import { initialsOf } from "../lib/monogram.js";

  let {
    title,
    detail,
    meta,
    href,
    badges = [],
    badgeHrefs = [],
    hashBadges = false,
    thumbSrc,
    thumbAlt,
    ...liAttrs
  }: {
    title: string;
    detail: string;
    meta: string;
    href: string;
    badges?: string[];
    badgeHrefs?: (string | null)[];
    hashBadges?: boolean;
    thumbSrc?: string;
    thumbAlt?: string;
    [key: string]: unknown;
  } = $props();

  const shown = $derived(
    (badges ?? []).slice(0, 3).map((label, i) => ({
      label: hashBadges ? `#${label.replace(/^#+/, "")}` : label,
      href: badgeHrefs[i] ?? null,
    })),
  );

  const initials = $derived(initialsOf(title));
</script>

<li class="w-full min-w-0 max-w-full" {...liAttrs}>
  <Card.Root class="h-full w-full min-w-0 max-w-full rounded-none [overflow-wrap:anywhere]">
    <Card.Header class="min-w-0 max-w-full">
      <div class="flex min-w-0 max-w-full flex-row flex-wrap items-start gap-4 [overflow-wrap:anywhere]">
        <!-- ~keep: shadcn Avatar.Root/Fallback wrapper with plain img thumb
          (no bits-ui Avatar.Image). Image renders display:none until its
          client loader flips status to loaded; effects never run in zero-JS
          SSG, so default status would hide every thumbnail, and on the client
          mount would flash the monogram before load. thumbSrc values are
          astro:assets getImage URLs (128px WebP, never raw PNG). SSR-safe
          initial loadingStatus keeps SSR HTML correct; Avatar.Fallback is
          context-safe here (pure-Svelte tree, Root provides context) and
          covers missing thumbs. Zero JS by design. -->
        <Avatar.Root
          class={cn(
            "flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-none select-none",
          )}
          loadingStatus={thumbSrc ? "loaded" : "error"}
          role="img"
          aria-label={`${title} monogram`}
          title={title}
        >
          {#if thumbSrc}
            <img
              src={thumbSrc}
              alt={thumbAlt ?? `${title} thumbnail`}
              class="aspect-square size-full rounded-none object-cover"
              loading="lazy"
              decoding="async"
            />
          {/if}
          <Avatar.Fallback
            class="rounded-none text-lg font-bold"
            style="background-color: color-mix(in oklab, var(--color-primary) 16%, var(--color-muted)); color: var(--color-foreground);"
          >
            {initials}
          </Avatar.Fallback>
        </Avatar.Root>
        <div class="min-w-0 flex-1">
          <Card.Title class="text-xl leading-snug font-medium">
            <a {href} class="underline-offset-4 hover:text-primary hover:underline">
              {title}
            </a>
          </Card.Title>
          <Card.Description class="mt-2 max-w-3xl text-base leading-relaxed text-foreground md:text-lg">
            {detail}
          </Card.Description>
        </div>
      </div>
    </Card.Header>
    <Card.Content class="min-w-0 max-w-full">
      <p class="flex min-w-0 max-w-full flex-wrap items-center gap-2 text-sm tabular-nums opacity-70 [overflow-wrap:anywhere]">
        <span>{meta}</span>
        <ArrowRight data-icon="inline-end" aria-hidden="true" />
      </p>
      {#if shown.length > 0}
        <p class="mt-3 flex min-w-0 max-w-full flex-wrap gap-2 [overflow-wrap:anywhere]">
          {#each shown as b (b.label)}
            <Badge href={b.href ?? undefined} variant="outline" class="h-auto min-w-0 max-w-full rounded-none py-1 text-sm whitespace-normal"
              >{b.label}</Badge
            >
          {/each}
        </p>
      {/if}
    </Card.Content>
  </Card.Root>
</li>
