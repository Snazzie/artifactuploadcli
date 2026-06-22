import { config as dotenvConfig } from "dotenv";
import { resolve } from "node:path";
import type { S3Config } from "./types.js";

interface EnvOverrides {
  bucket?: string;
  publicUrl?: string;
  endpoint?: string;
  region?: string;
}

export function loadEnvConfig(overrides: EnvOverrides): S3Config {
  dotenvConfig({ path: resolve(process.cwd(), ".env") });

  const accessKeyId = process.env["ASC_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["ASC_SECRET_ACCESS_KEY"];
  const bucket = overrides.bucket ?? process.env["ASC_BUCKET"];
  const publicUrl = overrides.publicUrl ?? process.env["ASC_PUBLIC_URL"];
  const endpoint = overrides.endpoint ?? process.env["ASC_ENDPOINT"];
  const region = overrides.region ?? process.env["ASC_REGION"] ?? "auto";

  const missing: string[] = [];
  if (!accessKeyId) missing.push("ASC_ACCESS_KEY_ID");
  if (!secretAccessKey) missing.push("ASC_SECRET_ACCESS_KEY");
  if (!bucket) missing.push("ASC_BUCKET (or --bucket flag)");
  if (!publicUrl) missing.push("ASC_PUBLIC_URL (or --public-url flag)");

  if (missing.length > 0) {
    console.error("\nMissing required configuration:");
    for (const v of missing) console.error(`  ${v}`);
    console.error("\nAdd these to .env in your working directory or pass as CLI flags.\n");
    process.exit(1);
  }

  return {
    endpoint,
    region,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    bucket: bucket!,
    publicUrl: publicUrl!,
  };
}
