# personal-site

Astro 7 SSG, static `dist/` deployed to Cloudflare Workers Static Assets.

## Binary assets (remote storage)

Raws live in Cloudflare R2 (Proton Drive dormant), not git. Fetch before dev/build:

```sh
mise run site:assets:fetch
vp run dev
vp run build
```

### First time (seed)

1. Set rclone env via fnox (Proton Pass vault `dev`; R2 keys active).
2. Put raw in gitignored folder `apps/personal-site/src/assets/` + root `assets/`.
3. Upload via the `--upload` wrapper (`mise run site:assets:upload`
   or `vp run personal-site#assets:upload`), which uploads new/changed
   raws then regens the manifest in one step. Root jpgs use
   `--asset-dir assets`.
4. Do dev/build.

Maintainer upload is the `--upload` wrapper (`site:assets:upload` /
`assets:upload`); manual single-key `rclone copyto` + `--regen-manifest`
is fallback only — see the runbook §5.

### Afterward (fresh clone and CI)

5. Set env (`fnox exec` locally, GitHub Secrets in CI).
6. Download via rclone (`mise run site:assets:fetch`).
7. Do dev/build. CI caches `src/assets` with the manifest as cache key
   and still gap-fills + verifies every run.

### Verify

```sh
vp run personal-site#assets:fetch -- --verify-only
vp run personal-site#assets:fetch -- --verify-only --check-remote
find . -name rclone.conf
```

Both the `rclone.conf` search and
`git ls-files | grep -Ei '\.(webp|avif|jpe?g|png|svg|gif|webm|mov|mp4|pdf|woff2|ttf|zip)$'`
must print nothing. Never hand-edit `.assets-manifest.json`.

Env is R2-only: the script requires `RCLONE_CONFIG_R2_*` variables and always
passes `--config /dev/null`, so no config file is ever read. Locally provide
env via `fnox exec` (Proton Pass vault `dev`); CI provides the same variables
via GitHub Secrets. Without them the script stops instead of contacting the
remote. `--verify-only` checks local sha256/size offline; adding
`--check-remote` also runs `rclone lsf` against the manifest remote and fails
closed when any `remote_key` is absent. `--upload` copies new/changed RAWs up
with `rclone copyto --checksum`, re-checks the keys via `lsf` (fail-closed),
then atomically regens the manifest. `prebuild` auto-fetches both
`src/assets` and the repo-root `assets` dir, so a fresh clone builds once
env is set.

## Pictures (vector-first)

Lists, home, contact, and about render vector SVG + lucide icons only (see
`src/components/WorkStrip`, `OrgStrip`,
`CertFigures` with `Icon.svelte`). Raster RAWs exist only as gitignored
build inputs in `src/assets/` (fetched via rclone, never committed) and are
rendered only in `[slug]` detail heroes via astro `<Image>` with
`widths` + `sizes` + `quality` (never widths+densities mixed, always
`loading`/`decoding` set), optimized to hashed `_astro` WebP/AVIF at build.
Remaining raster heroes are owner-archive `portrait.png` and `work-*.png`
project screenshots plus certificate/organization seals, each credited beside
its hero via `src/data/credits.ts` plus the footer colophon.
