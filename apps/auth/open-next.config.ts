import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext → Cloudflare Workers for auth.nebutra.com.
 *
 * Auth needs Node APIs (Better Auth, Prisma/`pg`) and outbound HTTPS to
 * Google OAuth — Workers with `nodejs_compat` run outside China ECS.
 * PlanetScale Postgres is reached via Hyperdrive (see wrangler.jsonc).
 *
 * Pattern mirrors apps/sailor-docs / apps/typelens.
 */
export default defineCloudflareConfig({});
