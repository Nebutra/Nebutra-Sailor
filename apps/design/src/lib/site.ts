import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";

/**
 * The site's own name, composed from the brand rather than typed out.
 *
 * Four files spelled it literally — the root metadata, its template, the home
 * heading and two page titles — which is four places a rebrand has to find. It
 * is one place now, and the brand-literal ratchet stops counting this app.
 */
export const SITE_NAME = `${brand.name} Design`;

/** Where the pieces around the library live. Composed from the brand's origins, never typed. */
export const SITE_ORIGIN = getBrandOrigin("design");
export const LANDING_ORIGIN = getBrandOrigin("landing");
/** Sailor Studio: the look of a project as one preset, reviewed in the browser. */
export const STUDIO_URL = `${LANDING_ORIGIN}/sailor/studio`;
/** The shadcn-format registry the Nebutra site serves from the @nebutra/ui catalog. */
export const REGISTRY_URL = `${LANDING_ORIGIN}/r/registry.json`;
export const NPM_UI_URL = "https://www.npmjs.com/package/@nebutra/ui";
export const NPM_CREATE_SAILOR_URL = "https://www.npmjs.com/package/create-sailor";
