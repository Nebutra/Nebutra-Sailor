const DEVELOPMENT_PUBLIC_URLS = {
  siteUrl: "http://localhost:3001",
  appUrl: "http://localhost:3001",
  apiUrl: "http://localhost:3002",
} as const;

const PRODUCTION_PUBLIC_URLS = {
  siteUrl: "https://app.nebutra.com",
  appUrl: "https://app.nebutra.com",
  apiUrl: "https://api.nebutra.com",
} as const;

export function getDefaultPublicUrls(nodeEnv: string | undefined) {
  return nodeEnv === "production" ? PRODUCTION_PUBLIC_URLS : DEVELOPMENT_PUBLIC_URLS;
}
