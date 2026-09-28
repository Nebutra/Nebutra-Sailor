import type { SiteId } from "./site-map";

/**
 * Which site this build of apps/landing is.
 *
 * - "nebutra": nebutra.com. Every page in site-map.ts is served.
 * - "template": the Sailor template, what `create-sailor` hands a new
 *   project. Only pages marked `template: true` exist, and links to the rest
 *   are dropped from the navigation and footer.
 *
 * template-build replaces this file with site.config.for-template.ts; nothing
 * else decides which site this is.
 */
export const SITE_ID = "nebutra" as SiteId;
