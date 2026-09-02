import { orbitAssetKey, RESOURCE_ROOT, skuSampleKey, wardrobeSampleKey } from "./resources";

export const CATALOG_ASSET_BUCKET = "nebutra-assets";
export const CATALOG_CACHE_CONTROL = "public, max-age=300, s-maxage=86400";

export const CATALOG_KINDS = ["orbit", "skus", "wardrobe"] as const;
export type CatalogKind = (typeof CATALOG_KINDS)[number];

export type CatalogSeedObject = {
  kind: CatalogKind;
  name: string;
  key: string;
  contentType: "image/jpeg" | "image/png";
};

const NAME: Record<CatalogKind, RegExp> = {
  orbit: /^[0-9]{2}\.jpg$/,
  skus: /^[a-z0-9]+(?:-[a-z0-9]+)*\.jpg$/,
  wardrobe: /^[a-z0-9]+(?:-[a-z0-9]+)*\.jpg$/,
};

export function catalogSeedObject(kind: CatalogKind, name: string): CatalogSeedObject {
  if (!NAME[kind].test(name)) {
    throw new Error(`invalid_catalog_name:${kind}:${name}`);
  }
  if (kind === "orbit") {
    return { kind, name, key: orbitAssetKey(name), contentType: "image/jpeg" };
  }
  if (kind === "skus") {
    return {
      kind,
      name,
      key: skuSampleKey(name.replace(/\.jpg$/, "")),
      contentType: "image/jpeg",
    };
  }
  return {
    kind,
    name,
    key: wardrobeSampleKey(name.replace(/\.jpg$/, "")),
    contentType: "image/jpeg",
  };
}

export function listCatalogSeedObjects(
  listing: Partial<Record<CatalogKind, readonly string[]>>,
): CatalogSeedObject[] {
  return CATALOG_KINDS.flatMap((kind) =>
    (listing[kind] ?? []).map((name) => catalogSeedObject(kind, name)),
  );
}

export function catalogPublicFile(object: CatalogSeedObject): string {
  return `public/${object.kind}/${object.name}`;
}

export function isCatalogKey(key: string): boolean {
  return (
    key.startsWith(`${RESOURCE_ROOT}/orbit/`) ||
    key.startsWith(`${RESOURCE_ROOT}/skus/`) ||
    key.startsWith(`${RESOURCE_ROOT}/wardrobe/`)
  );
}
