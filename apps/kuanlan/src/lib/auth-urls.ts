import { buildAuthCenterSignInUrl } from "@nebutra/auth";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";

export function kuanlanOrigin(env: Record<string, string | undefined> = process.env): string {
  return (
    env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (env.NODE_ENV === "development" ? "http://localhost:3120" : getBrandOrigin("kuanlan"))
  ).replace(/\/+$/, "");
}

export function kuanlanSignInUrl(
  returnPath = "/me",
  env: Record<string, string | undefined> = process.env,
): string {
  const path = returnPath.startsWith("/") ? returnPath : `/${returnPath}`;
  return buildAuthCenterSignInUrl(`${kuanlanOrigin(env)}${path}`, env);
}
