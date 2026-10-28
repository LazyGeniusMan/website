#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_DIR = join(HERE, "..");
const DEFAULT_ASSET_DIR = join(APP_DIR, "src", "assets");
const MANIFEST_NAME = ".assets-manifest.json";
const PLACEHOLDER = ".gitkeep";
const SCHEMA = 1;
const ALGORITHM = "sha256";
const PATH_RE = /^[a-z0-9][a-z0-9\-_]*\.[a-z0-9]+$/;
const REMOTE_RE = /^[A-Za-z0-9][A-Za-z0-9_-]*:.+$/;
const MIME_BY_EXT = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };
const RCLONE_MIN = "1.74.3";

function usage() {
  console.log(`fetch-assets.mjs — fetch + verify RAW assets (never optimized outputs)

Rclone flow (env-only, no config file):
  1. Provide R2 credentials via env only: RCLONE_CONFIG_R2_* variables
     (locally: fnox exec -- node scripts/fetch-assets.mjs; CI: GitHub Secrets).
     The script passes --config /dev/null so no rclone.conf file is ever read.
  2. Fetch (dev/build/CI): hash-gated rclone copyto per manifest entry with
     --checksum; post-fetch sha256 re-verify, fail-closed on mismatch.
  3. Verify: --verify-only checks local sha256/size (offline); with
     --check-remote it also runs rclone lsf on the remote and fails closed
     when any remote_key is absent or rclone errors.
  4. Upload (maintainer only): --upload copies new/changed RAW files up via
     rclone copyto --checksum, re-checks remote keys via lsf (fail-closed),
     then atomically regens the manifest. Never hand-edit the manifest.
  5. prebuild auto-fetch: package.json prebuild runs fetch for both
     apps/personal-site/src/assets and the repo-root assets dir, so a fresh
     clone builds once env is set.

Usage:
  node scripts/fetch-assets.mjs [options]

Options:
  --verify-only      hash-verify every manifest entry, fetch nothing (CI gate)
  --check-remote     with --verify-only (or alone): rclone lsf remote keys,
                     fail-closed on missing key or rclone error
  --changed-only     dev fast path: size pre-check, hash only size-changed files
  --regen-manifest   re-hash local RAW bytes, atomic rewrite manifest (seed only)
  --upload           upload new/changed local RAW files to remote, then regen
  --remote <ref>     override manifest remote (default: manifest remote)
  --asset-dir <dir>  asset root (default: apps/personal-site/src/assets)
  -h, --help         this text

Behaviors: reads <asset-dir>/.assets-manifest.json; hash-gated idempotent
skip when sha256 matches; else rclone copyto single RAW key with --checksum
+ throttle flags; then verify pass; exits non-zero on mismatch; prints
"ok <n> raw assets, skipped <m>, fetched <k>". Never writes optimized files.`);
}

function fail(msg) {
  console.error(`fetch-assets: error: ${msg}`);
  process.exit(1);
}

function sha256File(path) {
  const h = createHash("sha256");
  h.update(readFileSync(path));
  return h.digest("hex");
}

function loadManifest(assetDir) {
  const path = join(assetDir, MANIFEST_NAME);
  if (!existsSync(path)) fail(`manifest missing: ${path} (run with --regen-manifest on seed)`);
  let doc;
  try {
    doc = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    fail(`manifest invalid JSON: ${path}: ${e.message}`);
  }
  if (doc.schema !== SCHEMA) fail(`unsupported manifest schema ${doc.schema} (want ${SCHEMA})`);
  if (doc.algorithm !== ALGORITHM)
    fail(`unsupported algorithm ${doc.algorithm} (want ${ALGORITHM})`);
  if (typeof doc.remote !== "string" || !REMOTE_RE.test(doc.remote)) {
    fail(`manifest remote must match ${REMOTE_RE}`);
  }
  if (!Array.isArray(doc.assets)) fail("manifest assets[] missing");
  const paths = doc.assets.map((a) => a.path);
  const sorted = [...paths].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (paths.some((p, i) => p !== sorted[i])) fail("manifest assets[] not sorted by path");
  for (const a of doc.assets) {
    if (typeof a.path !== "string" || !PATH_RE.test(a.path)) {
      fail(`asset path fails sanitize rule: ${JSON.stringify(a.path)}`);
    }
    if (typeof a.remote_key !== "string" || !/^v1\/[0-9a-f]{64}\.[a-z0-9]+$/.test(a.remote_key)) {
      fail(`asset remote_key malformed: ${a.path}`);
    }
    if (/\.(webp|avif)$/i.test(a.remote_key) || !String(a.mime).startsWith("image/")) {
      fail(`manifest must hold RAW only (no webp/avif): ${a.path}`);
    }
    if (!["image/jpeg", "image/png"].includes(a.mime)) {
      fail(`manifest mime must be raw image/jpeg|image/png: ${a.path}`);
    }
    if (a.remote_key.slice(0, 3 + 64) !== `v1/${a.sha256}`) {
      fail(`remote_key must embed content sha256: ${a.path}`);
    }
    if (!Number.isInteger(a.size) || a.size <= 0) fail(`asset size invalid: ${a.path}`);
    if (!/^[0-9a-f]{64}$/.test(a.sha256 ?? "")) fail(`asset sha256 invalid: ${a.path}`);
  }
  return doc;
}

function checkEntry(assetDir, entry) {
  const file = join(assetDir, entry.path);
  if (!existsSync(file)) return { state: "missing" };
  const st = statSync(file);
  if (!st.isFile() || st.size !== entry.size) return { state: "changed", size: st.size };
  return { state: "size-ok", size: st.size };
}

function hashOk(assetDir, entry) {
  const file = join(assetDir, entry.path);
  if (!existsSync(file)) return false;
  const st = statSync(file);
  return st.isFile() && st.size === entry.size && sha256File(file) === entry.sha256;
}

function rcloneEnv() {
  if (!Object.keys(process.env).some((k) => k.startsWith("RCLONE_CONFIG_R2_"))) {
    fail(
      "remote credentials absent: need RCLONE_CONFIG_R2_* env (locally via fnox exec, CI via GitHub Secrets) for the r2: remote; refusing to contact remote",
    );
  }
  return { ...process.env };
}

function rcloneLsfKeys(env, remote) {
  const r = spawnSync("rclone", ["lsf", remote, "--format", "p", "--config", "/dev/null"], {
    env,
    encoding: "utf8",
  });
  if (r.error || r.status !== 0) {
    fail(`rclone lsf failed for ${remote} (exit ${r.status ?? "spawn-error"}): fail-closed`);
  }
  return new Set(
    (r.stdout ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
  );
}

function rcloneCheckRemote(env, remote, assets) {
  ensureRclone();
  const keys = rcloneLsfKeys(env, remote);
  const missing = assets
    .map((a) => a.remote_key)
    .filter((k) => !keys.has(k) && ![...keys].some((x) => x.endsWith(k.split("/").pop())));
  if (missing.length > 0) {
    for (const k of missing) console.error(`fetch-assets: remote key missing: ${k}`);
    fail(`${missing.length} remote key(s) absent on ${remote}: fail-closed`);
  }
  console.log(`fetch-assets: remote check ok (${assets.length} keys present on ${remote})`);
}

function ensureRclone() {
  const v = spawnSync("rclone", ["version"], { encoding: "utf8" });
  if (v.error || v.status !== 0) {
    fail(`rclone >= ${RCLONE_MIN} required but not found (mise tool aqua:rclone/rclone)`);
  }
}

function rcloneCopyTo(env, remote, entry, assetDir) {
  mkdirSync(assetDir, { recursive: true });
  const args = [
    "copyto",
    `${remote}/${entry.remote_key}`,
    join(assetDir, entry.path),
    "--config",
    "/dev/null",
    "--checksum",
    "--tpslimit",
    "4",
    "--checkers",
    "3",
    "--transfers",
    "2",
    "--contimeout",
    "30s",
    "--timeout",
    "60s",
    "--retries",
    "3",
    "--retries-sleep",
    "10s",
    "--log-level",
    "NOTICE",
  ];
  const r = spawnSync("rclone", args, { env, stdio: "inherit" });
  if (r.status !== 0) fail(`rclone copyto failed for ${entry.path} (exit ${r.status})`);
}

function rcloneUploadTo(env, remote, localFile, remoteKey) {
  const args = [
    "copyto",
    localFile,
    `${remote}/${remoteKey}`,
    "--config",
    "/dev/null",
    "--checksum",
    "--tpslimit",
    "4",
    "--checkers",
    "3",
    "--transfers",
    "2",
    "--contimeout",
    "30s",
    "--timeout",
    "60s",
    "--retries",
    "3",
    "--retries-sleep",
    "10s",
    "--log-level",
    "NOTICE",
  ];
  const r = spawnSync("rclone", args, { env, stdio: "inherit" });
  if (r.status !== 0) fail(`rclone copyto (upload) failed for ${localFile} (exit ${r.status})`);
}

async function regenManifest(assetDir, remoteOverride) {
  let sharp;
  try {
    ({ default: sharp } = await import("sharp"));
  } catch {
    fail("regen needs sharp (run from the app dir so node resolves devDependencies)");
  }
  const manifestPath = join(assetDir, MANIFEST_NAME);
  let remote = remoteOverride;
  if (!remote && existsSync(manifestPath)) {
    try {
      remote = JSON.parse(readFileSync(manifestPath, "utf8")).remote;
    } catch {
      remote = undefined;
    }
  }
  if (!remote) fail("regen needs --remote <remote>:<path> when no manifest exists yet");
  if (!REMOTE_RE.test(remote)) fail(`remote must match ${REMOTE_RE}`);
  const names = readdirSync(assetDir).filter(
    (n) => n !== MANIFEST_NAME && n !== PLACEHOLDER && !n.startsWith(".") && !n.endsWith(".tmp"),
  );
  const assets = [];
  for (const name of names.sort()) {
    const file = join(assetDir, name);
    if (!statSync(file).isFile()) continue;
    if (!PATH_RE.test(name.toLowerCase())) {
      console.error(`fetch-assets: skip unsanitized name: ${name}`);
      continue;
    }
    const lower = name.toLowerCase();
    const dot = lower.lastIndexOf(".");
    const ext = lower.slice(dot);
    if (ext === ".webp" || ext === ".avif") {
      console.error(`fetch-assets: skip optimized output (RAW only): ${name}`);
      continue;
    }
    const mime = MIME_BY_EXT[ext];
    if (!mime) {
      console.error(`fetch-assets: skip non-image raw: ${name}`);
      continue;
    }
    const meta = await sharp(file).metadata();
    const buf = readFileSync(file);
    const sha = createHash("sha256").update(buf).digest("hex");
    assets.push({
      path: lower,
      remote_key: `v1/${sha}${ext}`,
      size: buf.length,
      sha256: sha,
      mime,
      width: meta.width ?? 0,
      height: meta.height ?? 0,
    });
  }
  let commit = "unknown";
  try {
    commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
  } catch {}
  const doc = {
    schema: SCHEMA,
    algorithm: ALGORITHM,
    remote,
    generatedAt: new Date().toISOString(),
    commit,
    assets: assets.sort((a, b) => (a.path < b.path ? -1 : 1)),
  };
  const tmp = join(assetDir, `${MANIFEST_NAME}.tmp.${process.pid}`);
  writeFileSync(tmp, `${JSON.stringify(doc, null, 2)}\n`);
  renameSync(tmp, manifestPath);
  console.log(`fetch-assets: wrote ${manifestPath} (${assets.length} raw assets)`);
}

async function uploadAssets(assetDir, remoteOverride) {
  const manifestPath = join(assetDir, MANIFEST_NAME);
  const baseline = new Map();
  let remote = remoteOverride;
  if (existsSync(manifestPath)) {
    const manifest = loadManifest(assetDir);
    remote = remoteOverride ?? manifest.remote;
    for (const a of manifest.assets) baseline.set(a.path, a);
  }
  if (!remote) fail("upload needs --remote <remote>:<path> when no manifest exists yet");
  if (!REMOTE_RE.test(remote)) fail(`remote must match ${REMOTE_RE}`);
  const names = existsSync(assetDir)
    ? readdirSync(assetDir).filter(
        (n) =>
          n !== MANIFEST_NAME && n !== PLACEHOLDER && !n.startsWith(".") && !n.endsWith(".tmp"),
      )
    : [];
  const pending = [];
  let skipped = 0;
  for (const name of names.sort()) {
    const file = join(assetDir, name);
    if (!statSync(file).isFile()) continue;
    if (!PATH_RE.test(name.toLowerCase())) {
      console.error(`fetch-assets: skip unsanitized name: ${name}`);
      continue;
    }
    const lower = name.toLowerCase();
    const dot = lower.lastIndexOf(".");
    const ext = lower.slice(dot);
    if (ext === ".webp" || ext === ".avif") {
      console.error(`fetch-assets: skip optimized output (RAW only): ${name}`);
      continue;
    }
    if (!MIME_BY_EXT[ext]) {
      console.error(`fetch-assets: skip non-image raw: ${name}`);
      continue;
    }
    const buf = readFileSync(file);
    const sha = createHash("sha256").update(buf).digest("hex");
    const known = baseline.get(lower);
    if (known && known.sha256 === sha && known.size === buf.length) {
      skipped++;
      continue;
    }
    pending.push({ localFile: file, remoteKey: `v1/${sha}${ext}` });
  }
  let uploaded = 0;
  if (pending.length > 0) {
    ensureRclone();
    const env = rcloneEnv();
    for (const p of pending) {
      rcloneUploadTo(env, remote, p.localFile, p.remoteKey);
      uploaded++;
    }
    const keys = rcloneLsfKeys(env, remote);
    for (const p of pending) {
      const leaf = p.remoteKey.split("/").pop();
      if (!keys.has(p.remoteKey) && ![...keys].some((x) => x.endsWith(leaf))) {
        fail(`post-upload remote key absent (fail-closed): ${p.remoteKey}`);
      }
    }
    await regenManifest(assetDir, remote);
  }
  console.log(`ok ${uploaded} uploaded, skipped ${skipped}`);
}

async function main() {
  const argv = process.argv.slice(2);
  let verifyOnly = false;
  let checkRemote = false;
  let changedOnly = false;
  let regen = false;
  let upload = false;
  let remoteOverride;
  let assetDir = DEFAULT_ASSET_DIR;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") {
      usage();
      return;
    } else if (a === "--verify-only") verifyOnly = true;
    else if (a === "--check-remote") checkRemote = true;
    else if (a === "--changed-only") changedOnly = true;
    else if (a === "--regen-manifest") regen = true;
    else if (a === "--upload") upload = true;
    else if (a === "--remote") remoteOverride = argv[++i];
    else if (a === "--asset-dir") assetDir = argv[++i];
    else fail(`unknown flag: ${a} (see --help)`);
  }
  if (!remoteOverride) {
    const idx = argv.indexOf("--remote");
    if (idx !== -1 && !argv[idx + 1]) fail("--remote needs a value");
  }
  if (remoteOverride && !REMOTE_RE.test(remoteOverride)) fail(`remote must match ${REMOTE_RE}`);
  if (verifyOnly && regen) fail("--verify-only and --regen-manifest are exclusive");
  if (verifyOnly && upload) fail("--verify-only and --upload are exclusive");
  if (upload) {
    await uploadAssets(assetDir, remoteOverride);
    return;
  }
  if (regen) {
    await regenManifest(assetDir, remoteOverride);
    return;
  }

  const manifest = loadManifest(assetDir);
  const remote = remoteOverride ?? manifest.remote;
  let ok = 0;
  let skipped = 0;
  let fetched = 0;

  const needsFetch = [];
  for (const entry of manifest.assets) {
    const st = checkEntry(assetDir, entry);
    if (st.state === "missing" || st.state === "changed") {
      needsFetch.push(entry);
      continue;
    }
    if (changedOnly) {
      skipped++;
      ok++;
      continue;
    }
    if (hashOk(assetDir, entry)) {
      skipped++;
      ok++;
    } else {
      needsFetch.push(entry);
    }
  }

  if (verifyOnly) {
    if (needsFetch.length > 0) {
      for (const e of needsFetch) console.error(`fetch-assets: mismatch: ${e.path}`);
      fail(`${needsFetch.length} asset(s) missing or mismatched`);
    }
    if (checkRemote) {
      const env = rcloneEnv();
      rcloneCheckRemote(env, remote, manifest.assets);
    }
    console.log(`ok ${ok} raw assets, skipped ${skipped}, fetched ${fetched}`);
    return;
  }

  if (checkRemote && needsFetch.length === 0) {
    const env = rcloneEnv();
    rcloneCheckRemote(env, remote, manifest.assets);
  }

  if (needsFetch.length > 0) {
    ensureRclone();
    const env = rcloneEnv();
    for (const entry of needsFetch) {
      if (hashOk(assetDir, entry)) {
        skipped++;
        ok++;
        continue;
      }
      rcloneCopyTo(env, remote, entry, assetDir);
      fetched++;
      if (!hashOk(assetDir, entry)) fail(`post-fetch hash mismatch: ${entry.path}`);
      ok++;
    }
  } else if (changedOnly) {
  }

  for (const entry of manifest.assets) {
    if (!hashOk(assetDir, entry)) fail(`verify failed after fetch: ${entry.path}`);
  }
  ok = manifest.assets.length;
  console.log(`ok ${ok} raw assets, skipped ${skipped}, fetched ${fetched}`);
}

await main();
