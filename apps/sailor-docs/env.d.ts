// Cloudflare Workers env bindings for OpenNext (public docs host (brand.domains.docs)).
// Types are intentionally minimal so we do not depend on @cloudflare/workers-types
// (which publishes daily and trips the monorepo minimumReleaseAge gate).

interface CloudflareEnv {
  ASSETS?: { fetch: typeof fetch };
  NEXT_PUBLIC_DOCS_ORIGIN_URL?: string;
  DEPLOY_TARGET_SAILOR_DOCS?: string;
  INKEEP_API_KEY?: string;
  GITHUB_APP_ID?: string;
  GITHUB_APP_PRIVATE_KEY?: string;
}
