import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext Cloudflare adapter for the docs origin served at <site>/docs.
 *
 * Start with the default in-memory cache overrides. R2 incremental cache /
 * DO queue / D1 tag cache can be layered on later once traffic warrants it.
 */
export default defineCloudflareConfig({});
