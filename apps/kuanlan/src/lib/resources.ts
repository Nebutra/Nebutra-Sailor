export const RESOURCE_ROOT = "kuanlan";
export const DEFAULT_R2_PUBLIC_URL = "https://cdn.nebutra.com";

const ORBIT_NAME = /^[0-9]{2}\.jpg$/;
const MOMENT_ID = /^[a-zA-Z0-9_-]+$/;
const SKU_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ResourceStoreUnavailableError extends Error {
  constructor(message = "r2_unconfigured") {
    super(message);
    this.name = "ResourceStoreUnavailableError";
  }
}

export class InvalidResourceKeyError extends Error {
  constructor(message = "invalid_resource_key") {
    super(message);
    this.name = "InvalidResourceKeyError";
  }
}

export type MomentObjectPart = "print" | "source";

export function orbitAssetKey(name: string): string {
  if (!ORBIT_NAME.test(name)) {
    throw new InvalidResourceKeyError("orbit_name");
  }
  return `${RESOURCE_ROOT}/orbit/${name}`;
}

export function skuSampleKey(id: string): string {
  if (!SKU_ID.test(id)) {
    throw new InvalidResourceKeyError("sku_id");
  }
  return `${RESOURCE_ROOT}/skus/${id}.jpg`;
}

export function skuSampleSrc(id: string, base?: string): string {
  return publicAssetUrl(skuSampleKey(id), base);
}

const WARDROBE_ID = SKU_ID;

export function wardrobeSampleKey(id: string): string {
  if (!WARDROBE_ID.test(id)) {
    throw new InvalidResourceKeyError("wardrobe_id");
  }
  return `${RESOURCE_ROOT}/wardrobe/${id}.png`;
}

export function wardrobeSampleSrc(id: string, base?: string): string {
  return publicAssetUrl(wardrobeSampleKey(id), base);
}

export function momentUserPrefix(userId: string): string {
  if (!MOMENT_ID.test(userId)) {
    throw new InvalidResourceKeyError("user_id");
  }
  return `${RESOURCE_ROOT}/moments/id-photo/${userId}/`;
}

export function momentObjectKey(input: {
  kind: "id-photo";
  userId: string;
  id: string;
  part?: MomentObjectPart;
}): string {
  if (!MOMENT_ID.test(input.id)) {
    throw new InvalidResourceKeyError("moment_id");
  }
  const prefix = momentUserPrefix(input.userId);
  if (input.part === "source") {
    return `${prefix}${input.id}.source`;
  }
  return `${prefix}${input.id}.png`;
}

export function r2PublicBase(base?: string): string {
  return (
    base ??
    process.env.R2_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ??
    DEFAULT_R2_PUBLIC_URL
  ).replace(/\/$/, "");
}

export function publicAssetUrl(key: string, base?: string): string {
  if (!key.startsWith(`${RESOURCE_ROOT}/`) || key.includes("..")) {
    throw new InvalidResourceKeyError("public_key");
  }
  return `${r2PublicBase(base)}/${key}`;
}

export function resolveOrbitSrc(name: string, base?: string): string {
  return publicAssetUrl(orbitAssetKey(name), base);
}

export function isR2Configured(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY,
  );
}
