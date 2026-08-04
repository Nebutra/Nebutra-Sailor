import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext → Cloudflare Workers for auth.nebutra.com.
 *
 * Auth needs Node APIs (Better Auth, Prisma/`pg`) and outbound HTTPS to
 * Google OAuth — Workers with `nodejs_compat` run outside China ECS.
 * PlanetScale Postgres is reached via Hyperdrive (see wrangler.jsonc).
 *
 * `pg` optionally requires `pg-cloudflare` for workerd TCP sockets. NFT file
 * tracing often drops the optional package's dist/, then the OpenNext esbuild
 * pass fails with "Could not resolve pg-cloudflare". Force-install it into
 * the server function before bundling.
 */
const base = defineCloudflareConfig({});

export default {
  ...base,
  default: {
    ...base.default,
    install: {
      packages: ["pg-cloudflare@1.3.0", "pg@8.20.0"],
    },
  },
};
