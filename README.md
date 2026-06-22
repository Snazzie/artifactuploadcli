# artifactuploadcli

Share a file via a terminal QR code. Either:

- **Upload** it to Cloudflare R2 (or any S3-compatible storage) and print the public download URL as a scannable QR, or
- **Serve** it over your local network on an ephemeral HTTP server — no cloud config required.

Built with [Bun](https://bun.sh) + TypeScript ESM. Runs the source directly; no build step.

## Install

```bash
# Global (recommended)
bun add -g @snazzieslab/artifactuploadcli

# Or run from a clone
git clone https://github.com/SnazziesLab/artifactuploadcli
cd artifactuploadcli
bun install
```

## Usage

```bash
# Upload to R2, print URL + QR code
artifactuploadcli <file> [options]

# Serve a file over the LAN until Ctrl+C (no R2 config needed)
artifactuploadcli serve <file> [options]
```

If you're running from a clone instead of a global install, swap `artifactuploadcli` for `bun src/index.ts`.

### Upload options

| Flag | Env | Description |
| --- | --- | --- |
| `-b, --bucket <name>` | `R2_BUCKET` | R2 bucket name |
| `-u, --public-url <url>` | `R2_PUBLIC_URL` | Public URL prefix the file will be reachable at |
| `-n, --name <name>` | — | Remote object name (default: `{name}-{timestamp}{ext}`) |
| `--no-qr` | — | Skip QR code, just print the URL |
| `-h, --help` | — | Show help |

### Serve options

| Flag | Description |
| --- | --- |
| `-p, --port <n>` | Port to bind (default: `8787`, auto-falls back to the next free port up to +20) |
| `--no-qr` | Skip QR code |

## Configuration (upload only)

The CLI reads a `.env` file from the **current working directory** — so a single global install works per-project. Put your R2 creds in `.env` next to where you run the command:

```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
R2_PUBLIC_URL=https://files.example.com
```

Any of these can be overridden by CLI flags. Variables already set in your shell take precedence over `.env`.

`serve` reads no env — it only opens the file and binds a local port.

## Examples

```bash
# Upload an APK and get a scannable download link
artifactuploadcli ./app-release.apk

# Upload with a fixed remote name, no QR
artifactuploadcli ./build.ipa -n latest.ipa --no-qr

# Share a file with someone on the same Wi-Fi
artifactuploadcli serve ./video.mp4 -p 9000
```

## Development

```bash
bun src/index.ts <file>     # run the CLI from source
bun run check               # typecheck (tsc --noEmit) — no emit step
bun run build               # bundle to dist/index.js (used by npm publish)
```

There is no test suite. The S3 client is configured with `requestChecksumCalculation`/`responseChecksumValidation: "WHEN_REQUIRED"` for R2 compatibility — leave that alone.

## License

MIT
