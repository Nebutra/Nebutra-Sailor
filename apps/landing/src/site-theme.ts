import "@nebutra/theme/scoped/nebutra-site.css";
import "@/nebutra/site.css";

/**
 * The Brand Package this site wears on every document it renders: the locale
 * layout and the root not-found alike, so a missing page looks like the site
 * it is missing from. Importing this module brings the package's stylesheet.
 *
 * The template builds with site-theme.for-template.ts: no Brand Package.
 */
export const SITE_BRAND: string | undefined = "nebutra-site";
