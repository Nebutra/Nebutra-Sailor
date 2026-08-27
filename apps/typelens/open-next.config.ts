import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext Cloudflare adapter for typelens.nebutra.com.
 *
 * TypeLens is a catalog UI (static seed data + client GSAP). No Next
 * middleware/proxy is required. Default in-memory cache; R2/DO can be layered
 * later if traffic warrants it.
 *
 * Pattern mirrors apps/sailor-docs (OpenNext + wrangler Workers Assets).
 */
export default defineCloudflareConfig({});
