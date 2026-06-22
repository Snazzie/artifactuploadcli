# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-purpose CLI (runs on **Bun**, written in TypeScript ESM) that either:
- **Uploads** a file to any S3-compatible storage (AWS S3, MinIO, Cloudflare R2, etc.) and prints the public download URL as a terminal QR code, or
- **Serves** a file over the LAN via an ephemeral HTTP server with a QR code (no cloud config needed).

Entry point is `src/index.ts` (shebang `#!/usr/bin/env bun`), exposed as the `artifactservecli` bin.

## Commands

```bash
bun src/index.ts <file>            # upload + QR (alias: bun run start)
bun src/index.ts serve <file>      # serve over LAN until Ctrl+C
tsc --noEmit                       # typecheck (alias: bun run check) — no build step, Bun runs TS directly
```

Per user preference, this project uses **Bun**, not npm/node. There is no test suite and no compile/emit step (`noEmit: true`).

## Architecture

`index.ts` is the only orchestrator — it parses args (`node:util` `parseArgs`), validates the file path, branches on the `serve` positional, then delegates. Each other module is single-responsibility and imports are static and top-of-file:

- `env.ts` — `loadEnvConfig()` loads `.env` from **cwd** (not the install dir) and merges CLI overrides. Exits the process with a missing-vars report if S3 config is incomplete. Upload path only.
- `upload.ts` — `uploadToS3()` (multipart via `@aws-sdk/lib-storage` `Upload`, streams from disk, prints `%` progress) and `detectContentType()` (extension→MIME map, used by both upload and serve).
- `serve.ts` — `serveFile()` binds `Bun.serve` on `0.0.0.0`, auto-falls back across 20 ports from the requested one on `EADDRINUSE`, and `detectLanAddress()` picks the first non-internal IPv4 for the QR URL. Bun streams `Bun.file` with Range/206 support for free.
- `qr.ts` — terminal output + QR rendering (`qrcode-terminal`) for both flows.
- `types.ts` — shared interfaces; no logic.

Data flow (upload): `index` → `loadEnvConfig` → `uploadToS3` → `printResult`.
Data flow (serve): `index` → `serveFile` → `printServeInfo` → park process on signals.

## Critical gotchas

- **S3 checksums**: the S3 client sets `requestChecksumCalculation`/`responseChecksumValidation` to `"WHEN_REQUIRED"`. Some S3-compatible providers (notably Cloudflare R2) reject the flexible checksum headers `@aws-sdk` v3.500+ sends by default — do not remove these.
- **Module import extensions**: source is `.ts` but imports use `.js` extensions (e.g. `./env.js`) — required by `moduleResolution: "bundler"` + ESM. Keep this convention on new files.
- **Config is cwd-relative**: `.env` is read from the directory the command runs in, so the same global install works per-project.
- **`serve` needs no env**; only the upload path calls `loadEnvConfig`.

## Required env (upload only)

`ASC_ACCESS_KEY_ID`, `ASC_SECRET_ACCESS_KEY`, `ASC_BUCKET` (or `--bucket`), `ASC_PUBLIC_URL` (or `--public-url`). Optional: `ASC_ENDPOINT` (omit for AWS S3, set for R2/MinIO/etc.), `ASC_REGION` (defaults to `auto`). Live in `.env` (gitignored).
