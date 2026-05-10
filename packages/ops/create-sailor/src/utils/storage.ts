import fs from "node:fs";
import path from "node:path";

import {
  getStorageProvider,
  STORAGE_PROVIDERS,
  type StorageProviderId,
  type StorageProviderMeta,
  type StorageRegion,
} from "./storage-meta.js";

/**
 * Storage selection applier for create-sailor.
 *
 * Generates a `packages/storage` workspace package with a real SDK wrapper
 * for the chosen provider. Exposes `uploadFile` + `getSignedUrl`. L3 depth:
 * wrappers use the actual SDK API — no stubs, no TODOs. Retries, multi-part,
 * and observability are out of scope (L4 in `@nebutra/uploads`).
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const WORKSPACE_PACKAGE_NAME = "@nebutra/storage";

// ─── Filesystem helpers ─────────────────────────────────────────────────────

function writeFile(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function appendEnv(targetDir: string, block: string): void {
  const envExamplePath = path.join(targetDir, ".env.example");
  if (fs.existsSync(envExamplePath)) {
    fs.appendFileSync(envExamplePath, "\n" + block);
  } else {
    fs.writeFileSync(envExamplePath, block);
  }
}

function envBlockFor(provider: StorageProviderMeta): string {
  if (provider.envVars.length === 0) return "";
  const header = `# Storage provider: ${provider.name}`;
  const lines = provider.envVars.map((k) => `${k}=`).join("\n");
  return `${header}\n${lines}\n`;
}

// ─── Shared type file ───────────────────────────────────────────────────────

const TYPES_SOURCE = `/**
 * Inputs for the \`uploadFile\` wrapper. Keep this surface portable across
 * providers — provider-specific options belong in the wrapper itself.
 */
export interface UploadFileInput {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
  /** Optional access control. Most providers default to private. */
  acl?: "private" | "public-read";
}

export interface UploadFileResult {
  key: string;
  /** Public or signed URL, whichever the provider returns by default. */
  url?: string;
  raw?: unknown;
}

export interface SignedUrlOptions {
  /** Time-to-live in seconds. Defaults to 3600 (1h). */
  expiresIn?: number;
  /** Operation — "get" for download, "put" for direct upload. */
  operation?: "get" | "put";
  contentType?: string;
}
`;

// ─── Provider-specific index.ts bodies (L3 wrappers) ────────────────────────

function indexForR2(): string {
  return `/**
 * @${WORKSPACE_PACKAGE_NAME.slice(1)} — Cloudflare R2 via the S3-compatible API.
 *
 * Docs: https://developers.cloudflare.com/r2/api/s3/api/
 */
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";

import type {
  SignedUrlOptions,
  UploadFileInput,
  UploadFileResult,
} from "./types.js";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;

if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  throw new Error(
    "R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET must be configured",
  );
}

const client = new S3Client({
  region: "auto",
  endpoint: \`https://\${accountId}.r2.cloudflarestorage.com\`,
  credentials: { accessKeyId, secretAccessKey },
});

export async function uploadFile(input: UploadFileInput): Promise<UploadFileResult> {
  const response = await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    }),
  );
  return { key: input.key, raw: response };
}

export async function getSignedUrl(
  key: string,
  opts: SignedUrlOptions = {},
): Promise<string> {
  const expiresIn = opts.expiresIn ?? 3600;
  const command =
    opts.operation === "put"
      ? new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          ContentType: opts.contentType,
        })
      : new GetObjectCommand({ Bucket: bucket, Key: key });
  return awsGetSignedUrl(client, command, { expiresIn });
}

export type { UploadFileInput, UploadFileResult, SignedUrlOptions } from "./types.js";
`;
}

function indexForS3(): string {
  return `/**
 * @${WORKSPACE_PACKAGE_NAME.slice(1)} — AWS S3 wrapper.
 *
 * Docs: https://docs.aws.amazon.com/s3/
 */
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";

import type {
  SignedUrlOptions,
  UploadFileInput,
  UploadFileResult,
} from "./types.js";

const region = process.env.AWS_S3_REGION;
const bucket = process.env.S3_BUCKET;
if (!region || !bucket) {
  throw new Error("AWS_S3_REGION and S3_BUCKET must be configured");
}

const client = new S3Client({
  region,
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

export async function uploadFile(input: UploadFileInput): Promise<UploadFileResult> {
  const response = await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      ACL: input.acl,
    }),
  );
  return { key: input.key, raw: response };
}

export async function getSignedUrl(
  key: string,
  opts: SignedUrlOptions = {},
): Promise<string> {
  const expiresIn = opts.expiresIn ?? 3600;
  const command =
    opts.operation === "put"
      ? new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          ContentType: opts.contentType,
        })
      : new GetObjectCommand({ Bucket: bucket, Key: key });
  return awsGetSignedUrl(client, command, { expiresIn });
}

export type { UploadFileInput, UploadFileResult, SignedUrlOptions } from "./types.js";
`;
}

function indexForSupabaseStorage(): string {
  return `/**
 * @${WORKSPACE_PACKAGE_NAME.slice(1)} — Supabase Storage wrapper.
 *
 * Docs: https://supabase.com/docs/guides/storage
 */
import { createClient } from "@supabase/supabase-js";

import type {
  SignedUrlOptions,
  UploadFileInput,
  UploadFileResult,
} from "./types.js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_BUCKET;
if (!url || !serviceRoleKey || !bucket) {
  throw new Error(
    "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET must be configured",
  );
}

const client = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});

export async function uploadFile(input: UploadFileInput): Promise<UploadFileResult> {
  const { data, error } = await client.storage
    .from(bucket)
    .upload(input.key, input.body, {
      contentType: input.contentType,
      upsert: true,
    });
  if (error) {
    throw new Error(\`Supabase upload failed: \${error.message}\`);
  }
  return { key: data?.path ?? input.key, raw: data };
}

export async function getSignedUrl(
  key: string,
  opts: SignedUrlOptions = {},
): Promise<string> {
  const expiresIn = opts.expiresIn ?? 3600;
  if (opts.operation === "put") {
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUploadUrl(key);
    if (error || !data) {
      throw new Error(\`Supabase signed upload url failed: \${error?.message ?? "unknown"}\`);
    }
    return data.signedUrl;
  }
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(key, expiresIn);
  if (error || !data) {
    throw new Error(\`Supabase signed url failed: \${error?.message ?? "unknown"}\`);
  }
  return data.signedUrl;
}

export type { UploadFileInput, UploadFileResult, SignedUrlOptions } from "./types.js";
`;
}

function indexForAliyunOss(): string {
  return `/**
 * @${WORKSPACE_PACKAGE_NAME.slice(1)} — 阿里云 OSS wrapper via ali-oss.
 *
 * Docs: https://help.aliyun.com/product/31815.html
 */
import OSS from "ali-oss";

import type {
  SignedUrlOptions,
  UploadFileInput,
  UploadFileResult,
} from "./types.js";

const accessKeyId = process.env.ALIYUN_OSS_ACCESS_KEY;
const accessKeySecret = process.env.ALIYUN_OSS_ACCESS_SECRET;
const region = process.env.ALIYUN_OSS_REGION;
const bucket = process.env.ALIYUN_OSS_BUCKET;
if (!accessKeyId || !accessKeySecret || !region || !bucket) {
  throw new Error(
    "ALIYUN_OSS_ACCESS_KEY, ALIYUN_OSS_ACCESS_SECRET, ALIYUN_OSS_REGION, ALIYUN_OSS_BUCKET must be configured",
  );
}

const client = new OSS({ accessKeyId, accessKeySecret, region, bucket });

export async function uploadFile(input: UploadFileInput): Promise<UploadFileResult> {
  const body =
    typeof input.body === "string" ? Buffer.from(input.body) : Buffer.from(input.body);
  const response = await client.put(input.key, body, {
    mime: input.contentType,
  });
  return { key: response.name, url: response.url, raw: response };
}

export async function getSignedUrl(
  key: string,
  opts: SignedUrlOptions = {},
): Promise<string> {
  const expires = opts.expiresIn ?? 3600;
  return client.signatureUrl(key, {
    expires,
    method: opts.operation === "put" ? "PUT" : "GET",
    "Content-Type": opts.contentType,
  });
}

export type { UploadFileInput, UploadFileResult, SignedUrlOptions } from "./types.js";
`;
}

function indexForTencentCos(): string {
  return `/**
 * @${WORKSPACE_PACKAGE_NAME.slice(1)} — 腾讯云 COS wrapper via cos-nodejs-sdk-v5.
 *
 * Docs: https://cloud.tencent.com/document/product/436
 */
import COS from "cos-nodejs-sdk-v5";

import type {
  SignedUrlOptions,
  UploadFileInput,
  UploadFileResult,
} from "./types.js";

const secretId = process.env.TENCENT_COS_SECRET_ID;
const secretKey = process.env.TENCENT_COS_SECRET_KEY;
const bucket = process.env.TENCENT_COS_BUCKET;
const region = process.env.TENCENT_COS_REGION;
if (!secretId || !secretKey || !bucket || !region) {
  throw new Error(
    "TENCENT_COS_SECRET_ID, TENCENT_COS_SECRET_KEY, TENCENT_COS_BUCKET, TENCENT_COS_REGION must be configured",
  );
}

const cos = new COS({ SecretId: secretId, SecretKey: secretKey });

export async function uploadFile(input: UploadFileInput): Promise<UploadFileResult> {
  const body =
    typeof input.body === "string" ? Buffer.from(input.body) : Buffer.from(input.body);
  const response = await cos.putObject({
    Bucket: bucket,
    Region: region,
    Key: input.key,
    Body: body,
    ContentType: input.contentType,
  });
  return { key: input.key, url: response.Location, raw: response };
}

export async function getSignedUrl(
  key: string,
  opts: SignedUrlOptions = {},
): Promise<string> {
  const expires = opts.expiresIn ?? 3600;
  const url = cos.getObjectUrl({
    Bucket: bucket,
    Region: region,
    Key: key,
    Sign: true,
    Method: opts.operation === "put" ? "PUT" : "GET",
    Expires: expires,
  } as unknown as COS.GetObjectUrlParams);
  return url as unknown as string;
}

export type { UploadFileInput, UploadFileResult, SignedUrlOptions } from "./types.js";
`;
}

function indexForQiniu(): string {
  return `/**
 * @${WORKSPACE_PACKAGE_NAME.slice(1)} — 七牛云 Kodo wrapper.
 *
 * Docs: https://developer.qiniu.com/kodo
 */
import qiniu from "qiniu";

import type {
  SignedUrlOptions,
  UploadFileInput,
  UploadFileResult,
} from "./types.js";

const accessKey = process.env.QINIU_ACCESS_KEY;
const secretKey = process.env.QINIU_SECRET_KEY;
const bucket = process.env.QINIU_BUCKET;
const domain = process.env.QINIU_DOMAIN;
if (!accessKey || !secretKey || !bucket || !domain) {
  throw new Error(
    "QINIU_ACCESS_KEY, QINIU_SECRET_KEY, QINIU_BUCKET, QINIU_DOMAIN must be configured",
  );
}

const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
const config = new qiniu.conf.Config();
const formUploader = new qiniu.form_up.FormUploader(config);
const bucketManager = new qiniu.rs.BucketManager(mac, config);

function uploadToken(key: string): string {
  const putPolicy = new qiniu.rs.PutPolicy({ scope: \`\${bucket}:\${key}\` });
  return putPolicy.uploadToken(mac);
}

export async function uploadFile(input: UploadFileInput): Promise<UploadFileResult> {
  const body =
    typeof input.body === "string" ? Buffer.from(input.body) : Buffer.from(input.body);

  return new Promise<UploadFileResult>((resolve, reject) => {
    formUploader.put(
      uploadToken(input.key),
      input.key,
      body,
      new qiniu.form_up.PutExtra(undefined, undefined, input.contentType),
      (err, body, info) => {
        if (err) return reject(err);
        if (info.statusCode !== 200) {
          return reject(new Error(\`Qiniu upload failed: \${info.statusCode}\`));
        }
        resolve({ key: input.key, raw: body });
      },
    );
  });
}

export async function getSignedUrl(
  key: string,
  opts: SignedUrlOptions = {},
): Promise<string> {
  const expires = opts.expiresIn ?? 3600;
  if (opts.operation === "put") {
    // Qiniu issues upload tokens, not signed PUT URLs.
    return uploadToken(key);
  }
  const deadline = Math.floor(Date.now() / 1000) + expires;
  return bucketManager.privateDownloadUrl(domain, key, deadline);
}

export type { UploadFileInput, UploadFileResult, SignedUrlOptions } from "./types.js";
`;
}

function indexForProvider(id: StorageProviderId): string {
  switch (id) {
    case "r2":
      return indexForR2();
    case "s3":
      return indexForS3();
    case "supabase-storage":
      return indexForSupabaseStorage();
    case "aliyun-oss":
      return indexForAliyunOss();
    case "tencent-cos":
      return indexForTencentCos();
    case "qiniu":
      return indexForQiniu();
    case "none":
      return "export {};\n";
  }
}

// ─── package.json generator ─────────────────────────────────────────────────

function packageJsonFor(provider: StorageProviderMeta): string {
  const dependencies: Record<string, string> = {};
  if (provider.pkg && provider.pkgVersion) {
    dependencies[provider.pkg] = provider.pkgVersion;
  }

  // R2 and S3 both use the presigner helper.
  if (provider.id === "r2" || provider.id === "s3") {
    dependencies["@aws-sdk/s3-request-presigner"] = "^3.658.0";
  }

  const pkg = {
    name: WORKSPACE_PACKAGE_NAME,
    version: "0.1.0",
    private: true,
    description: `Object storage via ${provider.name}`,
    type: "module",
    main: "./dist/index.js",
    exports: {
      ".": {
        import: "./dist/index.js",
        types: "./dist/index.d.ts",
      },
    },
    scripts: {
      build: "tsup",
      typecheck: "tsc --noEmit",
      clean: "rm -rf dist .turbo",
    },
    dependencies,
    devDependencies: {
      tsup: "^8.5.0",
      typescript: "catalog:",
    },
  };

  return JSON.stringify(pkg, null, 2) + "\n";
}

// ─── Public entry point ─────────────────────────────────────────────────────

export async function applyStorageSelection(
  targetDir: string,
  storageId: string,
  _region: string,
): Promise<void> {
  if (storageId === "none") return;

  const provider = getStorageProvider(storageId);
  if (!provider) {
    throw new Error(
      `Unknown storage provider "${storageId}". Valid ids: ${STORAGE_PROVIDERS.map((p) => p.id).join(", ")}`,
    );
  }

  const pkgDir = path.join(targetDir, "packages", "storage");
  const srcDir = path.join(pkgDir, "src");

  if (fs.existsSync(srcDir)) {
    fs.rmSync(srcDir, { recursive: true, force: true });
  }

  writeFile(path.join(pkgDir, "package.json"), packageJsonFor(provider));
  writeFile(path.join(srcDir, "types.ts"), TYPES_SOURCE);
  writeFile(path.join(srcDir, "index.ts"), indexForProvider(provider.id));

  appendEnv(targetDir, envBlockFor(provider));
}

export type { StorageProviderId, StorageRegion };
