import { createClient } from "@sanity/client";

/**
 * The project this deployment reads. No default: it used to fall back to
 * Nebutra's own project, so every scaffolded site's blog and changelog quietly
 * showed Nebutra's posts. Unset, the queries return nothing and the landing
 * falls back to its sample content (see isSanityConfigured).
 */
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "";
/** Whether a Sanity project is configured. Query helpers return empty results when it is not. */
export const isSanityConfigured = projectId !== "";
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-01-01";

// createClient rejects an empty id; nothing is fetched through it unconfigured.
const clientProjectId = projectId || "unconfigured";

export const client = createClient({
  projectId: clientProjectId,
  dataset,
  apiVersion,
  // Blog/changelog pages already use Next cache tags and webhook revalidation.
  // Reading through Sanity's CDN can keep newly published localized slugs
  // invisible after a mutation, which turns valid posts into false 404s.
  useCdn: false,
});

/**
 * Server-side client with write access
 * Only use in server-side code
 */
export function getServerClient(token?: string) {
  const finalToken = token || process.env.SANITY_API_TOKEN;
  return createClient({
    projectId: clientProjectId,
    dataset,
    apiVersion,
    useCdn: false,
    ...(finalToken && { token: finalToken }),
  });
}
