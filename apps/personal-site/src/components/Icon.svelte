<!-- ~keep: Icon is a dynamic icon renderer (documented exception to direct
  lucide imports). Astro pages need one Svelte entry to render a dynamic icon
  component passed via the `of` prop (lucide icons + three brand-icon
  exceptions). Callers always pass a component reference, never a string key.
  No sizing classes here or on callers. site.css svg[data-icon] sizes to 1em.
  Always call with data-icon inline-start/end/inline + aria-hidden="true".
-->
<script lang="ts">
  import type { Component } from "svelte";

  interface Props {
    of: Component;
    [key: string]: unknown;
  }

  let { of: Rendered, ...rest }: Props = $props();
</script>

<Rendered {...rest} />
