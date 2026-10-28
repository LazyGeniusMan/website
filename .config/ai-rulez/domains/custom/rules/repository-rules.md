---
type: Decision
title: Repository Rules
x-ai-rulez:
  kind: rule
  id: Repository Rules
  domain: custom
  metadata:
    priority: critical
---

- This repository is a monorepo using Vite+. Always put website project in `apps` folder. Always put common logics, design system, design token, components and other reusable things in `packages` folder that used in `apps` project.
- Websites build output must be static site (SSG) with 100% compability to be deployed in HTTP web server like nginx, traefik, caddy, etc. Some of client side JS is allowed but API routes, SSR and SPA is forbidden.
- Always use Github Action for CI/CD.
- Always use Cloudflare for Deployment Target.
- Always use astro as web framework and svelte + shadcn-svelte as UI components.
- Always use components from shadcn-svelte and then apply existing design system and design token (create with  taste-skill if not available), never create components from scratch.
- Always use `nanostores` for state and store managements.
- Must support light and dark color mode with switcher. Use 3 state for color mode which are light, dark and system. Show all state in desktop switcher and show only active state in mobile switcher.
- All website pages must be responsive and adaptive in desktop, tablet and mobile devices, use modern way to achieve it. Use side navbar for desktop; main navbar on the left for website-scoped navigation and action (e.g. astro content collection list pages and color mode switcher, etc), secondary navbar on the right for page-scoped navigation and actions that using collapsible components for each section (e.g. table of content with highlighted current position, filters, etc). Use top and bottom navbar for tablet and mobile; main top navbar always appear for logo and color mode switcher, main bottom navbar always appear for website-scoped navigation, secondary navbar is drawer triggered by floating action button for page-scoped navigations and actions that using collapsible components for each section (e.g. table of content with highlighted current position, filters, etc).
- Always use drawer in mobile and tablet when openning input fields with options such as dropdown and date picker.
- Horizontal scroll interaction is forbidden in all pages and all devices, always wrap content responsively and adaptively.
- Astro content collection schema must mirror types, fields and relations/connections from `schema-dts` so that it's using schema from schema.org and produce valid JSON-LD for each pages. Each astro content collection must have a field that contains single image assets (logo/icon) to be used in list page, the field is different with images assets fields that can have multiple image assets to be used in detail page.
- Binary files must not commited to the git repository and must be gitignored, it must be downloaded from and uploaded to remote storage at dev time and build time to assets folder using rclone.
- Images files must be stored on assets folder and consumed using astro image or picture component to optimized it at build time.
- Always use vector illustration/shape assets and icon for all pages, using rasterized (e.g. png, jpg, etc) assets and icons are forbidden except in detail page for single astro content collection item.
