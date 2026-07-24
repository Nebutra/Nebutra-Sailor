import { getBrandPublicUrls } from "@nebutra/brand/metadata-helpers";

const DEVELOPMENT_PUBLIC_URLS = {
  siteUrl: "http://localhost:3001",
  appUrl: "http://localhost:3001",
  apiUrl: "http://localhost:3002",
  authUrl: "http://localhost:3101",
} as const;

/** Production defaults dogfood brand.domains — never hardcode product hosts. */
export function getDefaultPublicUrls(nodeEnv: string | undefined) {
  if (nodeEnv === "production") {
    const b = getBrandPublicUrls();
    return {
      siteUrl: b.appUrl,
      appUrl: b.appUrl,
      apiUrl: b.apiUrl,
      authUrl: b.authUrl,
    } as const;
  }
  return DEVELOPMENT_PUBLIC_URLS;
}
