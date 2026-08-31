export const RESOURCE_ROOT = "kuanlan";
export const DEFAULT_R2_PUBLIC_URL = "https://cdn.nebutra.com";

const ORBIT_NAME = /^[0-9]{2}\.jpg$/;
const MOMENT_ID = /^[a-zA-Z0-9_-]+$/;

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

export function momentObjectKey(input: {
  kind: "id-photo";
  id: string;
  part?: MomentObjectPart;
}): string {
  if (!MOMENT_ID.test(input.id)) {
    throw new InvalidResourceKeyError("moment_id");
  }
  if (input.part === "source") {
    return `${RESOURCE_ROOT}/moments/${input.kind}/${input.id}.source`;
  }
  return `${RESOURCE_ROOT}/moments/${input.kind}/${input.id}.png`;
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
