/**
 * Framing policy. The site refuses to be framed (X-Frame-Options DENY, CSP
 * frame-ancestors 'none') with one exception: Sailor Studio's catalog frame,
 * which Studio itself embeds so a chosen look covers dialogs and menus that
 * portal to <body> (ADR 2026-09-27 UI catalog). Same origin only, one path.
 *
 * Read by next.config.ts (headers) and src/proxy.ts (edge), so the two cannot
 * disagree about which page is the exception.
 */

const LOCALE = "(?:/[A-Za-z]{2}(?:-[A-Za-z]{2,4})?)?";

/** The one page that may be framed — by the site itself. */
export const SELF_FRAMED_PAGE = new RegExp(`^${LOCALE}/sailor/studio/frame/?$`);

/** Header-rule sources for it (next.config `headers()` matches paths, not regexes). */
export const SELF_FRAMED_SOURCES = ["/sailor/studio/frame", "/:locale/sailor/studio/frame"];

/** The page allowed to frame it. */
export const SELF_FRAMING_SOURCES = ["/sailor/studio", "/:locale/sailor/studio"];
