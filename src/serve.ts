import { createServer } from "node:http";
import type { Server } from "node:http";
import { networkInterfaces } from "node:os";
import { basename } from "node:path";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { detectContentType } from "./upload.js";
import type { ServeOptions, ServeResult } from "./types.js";

const DEFAULT_PORT = 8787;
const MAX_PORT_TRIES = 20;

/** First non-internal IPv4 address — the address other devices on the LAN can reach. */
export function detectLanAddress(): string {
  const ifaces = networkInterfaces();
  for (const addrs of Object.values(ifaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === "IPv4" && !addr.internal) return addr.address;
    }
  }
  return "127.0.0.1";
}

function encodePathSegment(name: string): string {
  return encodeURIComponent(name);
}

/** Try to bind one port; resolves on `listening`, rejects on error (e.g. EADDRINUSE). */
function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (err: unknown): void => {
      server.off("listening", onListening);
      reject(err);
    };
    const onListening = (): void => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, "0.0.0.0");
  });
}

/**
 * Serve a single file over HTTP on the LAN until the process is killed.
 * Tries the requested port, then auto-falls back to the next free port.
 * Supports HTTP Range requests (206) so large downloads can resume.
 * Resolves once the server is listening; the returned server keeps running.
 */
export async function serveFile(options: ServeOptions): Promise<ServeResult> {
  const { filePath } = options;
  const fileName = basename(filePath);
  const contentType = detectContentType(filePath);
  const { size: fileSizeBytes } = await stat(filePath);

  const host = options.host ?? detectLanAddress();
  const startPort = options.port ?? DEFAULT_PORT;
  const routePath = `/${encodePathSegment(fileName)}`;

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== routePath && url.pathname !== "/") {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }

    const baseHeaders: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Accept-Ranges": "bytes",
    };

    // Parse a single "bytes=start-end" range; ignore anything more exotic.
    const range = req.headers.range;
    const match = range ? /^bytes=(\d*)-(\d*)$/.exec(range) : null;
    if (match) {
      const startRaw = match[1];
      const endRaw = match[2];
      const start = startRaw ? Number(startRaw) : 0;
      const end = endRaw ? Number(endRaw) : fileSizeBytes - 1;
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= fileSizeBytes) {
        res.writeHead(416, { "Content-Range": `bytes */${fileSizeBytes}` });
        res.end();
        return;
      }
      res.writeHead(206, {
        ...baseHeaders,
        "Content-Range": `bytes ${start}-${end}/${fileSizeBytes}`,
        "Content-Length": String(end - start + 1),
      });
      createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, { ...baseHeaders, "Content-Length": String(fileSizeBytes) });
    createReadStream(filePath).pipe(res);
  });

  let lastErr: unknown;
  for (let i = 0; i < MAX_PORT_TRIES; i++) {
    const port = startPort + i;
    try {
      await listen(server, port);
      const downloadUrl = `http://${host}:${port}${routePath}`;
      return { server, downloadUrl, fileName, fileSizeBytes, port };
    } catch (err) {
      lastErr = err;
      const code = (err as { code?: string }).code;
      if (code === "EADDRINUSE") continue;
      throw err;
    }
  }
  throw new Error(
    `Could not bind a port in range ${startPort}-${startPort + MAX_PORT_TRIES - 1}: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`,
  );
}
