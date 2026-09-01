import { buildAuthCenterSignInUrl } from "@nebutra/auth";

export function kuanlanOrigin(env: Record<string, string | undefined> = process.env): string {
  return (
    env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (env.NODE_ENV === "development" ? "http://localhost:3120" : "https://kuanlan.nebutra.com")
  ).replace(/\/+$/, "");
}

export function kuanlanSignInUrl(
  returnPath = "/me",
  env: Record<string, string | undefined> = process.env,
): string {
  const path = returnPath.startsWith("/") ? returnPath : `/${returnPath}`;
  return buildAuthCenterSignInUrl(`${kuanlanOrigin(env)}${path}`, env);
}
