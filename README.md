# artifactservecli

Share a file via a terminal QR code. Either:

- **Upload** it to any S3-compatible storage (AWS S3, MinIO, Cloudflare R2, Backblaze B2, …) and print the public download URL as a scannable QR, or
- **Serve** it over your local network on an ephemeral HTTP server — no cloud config required.

Built with [Bun](https://bun.sh) + TypeScript ESM. Runs the source directly; no build step.

## Install

```bash
# Global (recommended)
bun add -g @snazzieslab/artifactservecli

# Or run from a clone
git clone https://github.com/SnazziesLab/artifactservecli
cd artifactservecli
bun install
```

## Usage

```bash
# Upload, print URL + QR code
artifactservecli <file> [options]

# Serve a file over the LAN until Ctrl+C (no cloud config needed)
artifactservecli serve <file> [options]
```

If you're running from a clone instead of a global install, swap `artifactservecli` for `bun src/index.ts`.

### Upload options

| Flag | Env | Description |
| --- | --- | --- |
| `-b, --bucket <name>` | `ASC_BUCKET` | Bucket name |
| `-u, --public-url <url>` | `ASC_PUBLIC_URL` | Public URL prefix the file will be reachable at |
| `-e, --endpoint <url>` | `ASC_ENDPOINT` | S3 endpoint URL (omit for AWS S3) |
| `-r, --region <name>` | `ASC_REGION` | S3 region (default: `auto`) |
| `-n, --name <name>` | — | Remote object name (default: `{name}-{timestamp}{ext}`) |
| `--no-qr` | — | Skip QR code, just print the URL |
| `-h, --help` | — | Show help |

### Serve options

| Flag | Description |
| --- | --- |
| `-p, --port <n>` | Port to bind (default: `8787`, auto-falls back to the next free port up to +20) |
| `--no-qr` | Skip QR code |

## Configuration (upload only)

The CLI reads a `.env` file from the **current working directory** — so a single global install works per-project. Put your credentials in `.env` next to where you run the command:

```
ASC_ACCESS_KEY_ID=...
ASC_SECRET_ACCESS_KEY=...
ASC_BUCKET=...
ASC_PUBLIC_URL=https://files.example.com
ASC_ENDPOINT=...      # optional; omit for AWS S3
ASC_REGION=...        # optional; default: auto
```

Any of these can be overridden by CLI flags. Variables already set in your shell take precedence over `.env`.

`serve` reads no env — it only opens the file and binds a local port.

### Provider examples

**AWS S3** — omit endpoint, set region:

```
ASC_REGION=us-east-1
ASC_BUCKET=my-bucket
ASC_PUBLIC_URL=https://my-bucket.s3.amazonaws.com
```

**Cloudflare R2** — set endpoint, region stays `auto`:

```
ASC_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
ASC_BUCKET=my-bucket
ASC_PUBLIC_URL=https://files.example.com   # your R2 custom domain
```

**MinIO / self-hosted** — set endpoint to your server:

```
ASC_ENDPOINT=https://minio.example.com
ASC_BUCKET=my-bucket
ASC_PUBLIC_URL=https://minio.example.com/my-bucket
```

## Examples

```bash
# Upload an APK and get a scannable download link
artifactservecli ./app-release.apk

# Upload with a fixed remote name, no QR
artifactservecli ./build.ipa -n latest.ipa --no-qr

# Share a file with someone on the same Wi-Fi
artifactservecli serve ./video.mp4 -p 9000
```

## Development

```bash
bun src/index.ts <file>     # run the CLI from source
bun run check               # typecheck (tsc --noEmit) — no emit step
bun run build               # bundle to dist/index.js (used by npm publish)
```

There is no test suite. The S3 client is configured with `requestChecksumCalculation`/`responseChecksumValidation: "WHEN_REQUIRED"` because some S3-compatible providers (notably Cloudflare R2) reject the flexible checksum headers the AWS SDK sends by default — leave that alone.

## License

MIT
