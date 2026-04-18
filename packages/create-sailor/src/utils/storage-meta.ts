/**
 * Storage provider registry — single source of truth for the create-sailor CLI.
 *
 * Covers 6 concrete object-storage providers (3 global + 3 CN) plus a `none`
 * sentinel for scaffolds that want to bring their own integration.
 */

export type StorageProviderId =
  | "r2"
  | "s3"
  | "supabase-storage"
  | "aliyun-oss"
  | "tencent-cos"
  | "qiniu"
  | "none";

export type StorageRegion = "global" | "cn";

export interface StorageProviderMeta {
  id: StorageProviderId;
  name: string;
  region: StorageRegion;
  envVars: string[];
  docs: string;
  /** npm package that provides the SDK. Undefined for `none`. */
  pkg?: string;
  /** Package version range to pin in the generated `package.json`. */
  pkgVersion?: string;
}

export const STORAGE_PROVIDERS: StorageProviderMeta[] = [
  // ─── Global ────────────────────────────────────────────────────────────────
  {
    id: "r2",
    name: "Cloudflare R2",
    region: "global",
    envVars: ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"],
    docs: "https://developers.cloudflare.com/r2/api/s3/api/",
    pkg: "@aws-sdk/client-s3",
    pkgVersion: "^3.658.0",
  },
  {
    id: "s3",
    name: "AWS S3",
    region: "global",
    envVars: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_S3_REGION", "S3_BUCKET"],
    docs: "https://docs.aws.amazon.com/s3/",
    pkg: "@aws-sdk/client-s3",
    pkgVersion: "^3.658.0",
  },
  {
    id: "supabase-storage",
    name: "Supabase Storage",
    region: "global",
    envVars: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_BUCKET"],
    docs: "https://supabase.com/docs/guides/storage",
    pkg: "@supabase/supabase-js",
    pkgVersion: "^2.45.4",
  },

  // ─── CN ────────────────────────────────────────────────────────────────────
  {
    id: "aliyun-oss",
    name: "阿里云 OSS",
    region: "cn",
    envVars: [
      "ALIYUN_OSS_ACCESS_KEY",
      "ALIYUN_OSS_ACCESS_SECRET",
      "ALIYUN_OSS_REGION",
      "ALIYUN_OSS_BUCKET",
    ],
    docs: "https://help.aliyun.com/product/31815.html",
    pkg: "ali-oss",
    pkgVersion: "^6.21.0",
  },
  {
    id: "tencent-cos",
    name: "腾讯云 COS",
    region: "cn",
    envVars: [
      "TENCENT_COS_SECRET_ID",
      "TENCENT_COS_SECRET_KEY",
      "TENCENT_COS_BUCKET",
      "TENCENT_COS_REGION",
    ],
    docs: "https://cloud.tencent.com/document/product/436",
    pkg: "cos-nodejs-sdk-v5",
    pkgVersion: "^2.13.7",
  },
  {
    id: "qiniu",
    name: "七牛云 Kodo",
    region: "cn",
    envVars: ["QINIU_ACCESS_KEY", "QINIU_SECRET_KEY", "QINIU_BUCKET", "QINIU_DOMAIN"],
    docs: "https://developer.qiniu.com/kodo",
    pkg: "qiniu",
    pkgVersion: "^7.14.0",
  },

  // ─── None ──────────────────────────────────────────────────────────────────
  {
    id: "none",
    name: "None",
    region: "global",
    envVars: [],
    docs: "",
  },
];

export function getStorageProvider(id: string): StorageProviderMeta | undefined {
  return STORAGE_PROVIDERS.find((p) => p.id === id);
}

export const STORAGE_PROVIDERS_BY_REGION = STORAGE_PROVIDERS.reduce<
  Record<StorageRegion, StorageProviderMeta[]>
>(
  (acc, p) => {
    if (!acc[p.region]) acc[p.region] = [];
    acc[p.region].push(p);
    return acc;
  },
  {} as Record<StorageRegion, StorageProviderMeta[]>,
);
