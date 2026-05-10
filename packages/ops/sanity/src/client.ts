import { createClient } from "@sanity/client";

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "wyfqr24v";
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-01-01";

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: process.env.NODE_ENV === "production",
});

/**
 * Server-side client with write access
 * Only use in server-side code
 */
export function getServerClient(token?: string) {
  const finalToken = token || process.env.SANITY_API_TOKEN;
  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    ...(finalToken && { token: finalToken }),
  });
}
