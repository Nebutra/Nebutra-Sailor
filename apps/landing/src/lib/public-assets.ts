import { publicAssetUrl } from "@nebutra/brand/metadata-helpers";

export function landingPublicSrc(path: string): string {
  return publicAssetUrl(`landing/${path.replace(/^\/+/, "")}`);
}
