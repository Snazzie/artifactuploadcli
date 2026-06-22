export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
}

export interface UploadOptions {
  config: R2Config;
  filePath: string;
  remoteName: string;
  contentType: string;
}

export interface UploadResult {
  remoteName: string;
  downloadUrl: string;
  fileSizeBytes: number;
}

export interface ServeOptions {
  filePath: string;
  port?: number;
  host?: string;
}

export interface ServeResult {
  server: import("node:http").Server;
  downloadUrl: string;
  fileName: string;
  fileSizeBytes: number;
  port: number;
}
