import type { SiteId } from "./site-map";

/**
 * Which site this build of apps/landing is. See site.config.ts; template-build
 * puts this file in its place, so the template serves its own pages only.
 */
export const SITE_ID = "template" as SiteId;
