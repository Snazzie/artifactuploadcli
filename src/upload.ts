import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { UploadOptions, UploadResult } from "./types.js";

const MIME_MAP: Readonly<Record<string, string>> = {
  apk: "application/vnd.android.package-archive",
  ipa: "application/octet-stream",
  zip: "application/zip",
  tar: "application/x-tar",
  gz: "application/gzip",
  pdf: "application/pdf",
  json: "application/json",
  txt: "text/plain",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  mp4: "video/mp4",
  mp3: "audio/mpeg",
} as const;

export function detectContentType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  return MIME_MAP[ext] ?? "application/octet-stream";
}

export async function uploadToS3(options: UploadOptions): Promise<UploadResult> {
  const { config, filePath, remoteName, contentType } = options;

  const client = new S3Client({
    region: config.region,
    ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // Some S3-compatible providers (e.g. Cloudflare R2) reject the flexible
    // checksum headers @aws-sdk v3.500+ sends by default.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  const { size: fileSizeBytes } = await stat(filePath);
  const sizeMb = (fileSizeBytes / 1024 / 1024).toFixed(1);

  console.log(`\nUploading ${remoteName} (${sizeMb}MB)...`);

  const upload = new Upload({
    client,
    params: {
      Bucket: config.bucket,
      Key: remoteName,
      Body: createReadStream(filePath),
      ContentType: contentType,
    },
  });

  upload.on("httpUploadProgress", ({ loaded, total }) => {
    if (loaded !== undefined && total !== undefined) {
      const pct = Math.round((loaded / total) * 100);
      process.stdout.write(`\r  ${pct}%`);
    }
  });

  await upload.done();
  process.stdout.write("\r  100%\n");

  const downloadUrl = `${config.publicUrl.replace(/\/$/, "")}/${remoteName}`;
  return { remoteName, downloadUrl, fileSizeBytes };
}
