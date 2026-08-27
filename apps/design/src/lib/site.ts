import { brand } from "@nebutra/brand/metadata";

/**
 * The site's own name, composed from the brand rather than typed out.
 *
 * Four files spelled it literally — the root metadata, its template, the home
 * heading and two page titles — which is four places a rebrand has to find. It
 * is one place now, and the brand-literal ratchet stops counting this app.
 */
export const SITE_NAME = `${brand.name} Design`;
