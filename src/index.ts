#!/usr/bin/env node
import { parseArgs } from "node:util";
import { existsSync } from "node:fs";
import { basename, extname } from "node:path";
import { loadEnvConfig } from "./env.js";
import { uploadToR2, detectContentType } from "./upload.js";
import { printResult, printServeInfo } from "./qr.js";
import { serveFile } from "./serve.js";

const HELP = `
artifactuploadcli - Upload a file to Cloudflare R2, or serve it on the local network, with a QR code

Usage:
  artifactuploadcli <file> [options]          Upload to R2 and print a QR code
  artifactuploadcli serve <file> [options]    Serve the file over LAN until Ctrl+C

Upload options:
  -b, --bucket       R2 bucket name         (env: R2_BUCKET)
  -u, --public-url   Public R2 URL prefix   (env: R2_PUBLIC_URL)
  -n, --name         Remote object name     (default: {name}-{timestamp}{ext})
      --no-qr        Skip QR code
  -h, --help         Show this help

Serve options:
  -p, --port         Port to bind           (default: 8787, auto-fallback if busy)
      --no-qr        Skip QR code

.env variables (loaded from current directory, upload only):
  R2_ACCOUNT_ID
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
  R2_BUCKET
  R2_PUBLIC_URL
`;

function buildRemoteName(filePath: string): string {
  const ext = extname(filePath);
  const name = basename(filePath, ext);
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `${name}-${ts}${ext}`;
}

async function runServe(filePath: string, port: number | undefined, showQr: boolean): Promise<void> {
  const result = await serveFile({ filePath, port });
  printServeInfo(result, showQr);
  // Keep the process alive until killed; stop the server cleanly on signals.
  const shutdown = (): void => {
    result.server.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  await new Promise<never>(() => {});
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    strict: true,
    allowPositionals: true,
    options: {
      bucket: { type: "string", short: "b" },
      "public-url": { type: "string", short: "u" },
      name: { type: "string", short: "n" },
      port: { type: "string", short: "p" },
      "no-qr": { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(HELP);
    process.exit(0);
  }

  const showQr = values["no-qr"] !== true;
  const isServe = positionals[0] === "serve";
  const filePath = isServe ? positionals[1] : positionals[0];

  if (!filePath) {
    console.error("Error: no file specified.\n");
    console.log(HELP);
    process.exit(1);
  }

  if (!existsSync(filePath)) {
    console.error(`Error: file not found: ${filePath}`);
    process.exit(1);
  }

  if (isServe) {
    const port = values.port !== undefined ? Number(values.port) : undefined;
    if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535)) {
      console.error(`Error: invalid port: ${values.port}`);
      process.exit(1);
    }
    await runServe(filePath, port, showQr);
    return;
  }

  const config = loadEnvConfig({
    bucket: values.bucket,
    publicUrl: values["public-url"],
  });

  const remoteName = values.name ?? buildRemoteName(filePath);
  const contentType = detectContentType(filePath);

  const result = await uploadToR2({ config, filePath, remoteName, contentType });

  printResult(result, showQr);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("\nUpload failed:", msg);
  process.exit(1);
});
