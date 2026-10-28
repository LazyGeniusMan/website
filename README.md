# yansyah-website

![personal-site](https://github.com/LazyGeniusMan/website/actions/workflows/personal-site.yml/badge.svg)
![license](https://img.shields.io/badge/license-TBD-lightgrey)

Personal site for Andriyansyah Nurrachman. Astro 7 SSG + Svelte 5 islands, Tailwind v4, static `dist/` deployed to Cloudflare Workers Static Assets. Zero JS by default; no SSR adapter, no analytics beacon.

## Installation

Requires Node `>=22.18.0` (see `package.json` engines).

```sh
vp install
```

## Quickstart

```sh
vp run dev    # personal-site dev server
vp check      # format, lint, typecheck
vp test       # unit tests (tools/generators)
vp run build  # SSG build all workspaces
```

### Binary assets (first clone)

Images are not in git. Authenticate Proton Pass (vault `dev`, `pass-cli
login`) so `fnox exec` can inject the R2 secret set (names only, never
values: `RCLONE_CONFIG_R2_*` — see `.env.example`; Proton names stay as a
dormant alternative), then:

```sh
mise run site:assets:fetch   # download raws via rclone (env-only, --config /dev/null)
vp run dev                   # or vp run build
```

Maintainers uploading new raws: `mise run site:assets:upload` (wrapper
uploads new/changed raws, then regens the manifest; root jpgs via
`--asset-dir assets`). Manual single-key `rclone copyto` +
`--regen-manifest` is fallback only — see the
runbook. CI caches `src/assets` with the manifest as cache key and
re-verifies every run.

Per-workspace: `vp run personal-site#verify-dist` checks dist budgets, link gate, and hosting files after build.

## Contributing

No separate CONTRIBUTING file. Follow `AGENTS.md` (conventional commits, `vp`/`vpx` only — never `npm`/`pnpm`/`bun`/`npx`, minimal diffs, verify before claiming done).

## License

Apache 2.0
