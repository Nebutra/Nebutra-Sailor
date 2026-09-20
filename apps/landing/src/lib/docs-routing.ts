import { toContentLocale } from "@nebutra/i18n/locales";
import { routing } from "@/i18n/routing";

/**
 * Docs are a Next.js zone mounted at `/docs` on this site.
 *
 * Documentation used to live on its own subdomain and `/docs` 302'd there, so
 * the product's own host was never where its documentation lived. It is a path
 * now, and the bundle that renders it is a separate deployment reached as an
 * origin — never as an address a visitor sees.
 *
 * The forward is deliberately **identity**: `/docs/<anything>` goes to
 * `<upstream>/docs/<anything>`, byte for byte. The bundle sets the matching
 * `basePath`, so every URL it emits — `_next/*` assets, internal links, redirect
 * Locations, sitemap entries — is already in the `/docs` space the visitor is
 * in, and needs no translation on the way back.
 *
 * An earlier version mapped `/docs/<slug>` to `<upstream>/<locale>/<slug>`,
 * stripping the prefix and injecting a locale. It could not work: a proxy sees
 * the request, not the response body, so nothing could rewrite the URLs the
 * bundle emitted. Every stylesheet 404'd against this app's origin, the bundle's
 * own redirects sent visitors to `<site>/en/...` outside the docs, and the
 * sitemap published `/docs/en/<slug>` — paths that resolve to nothing. A dumb
 * forward has none of those failure modes because it invents nothing.
 */
const DOCS_BASE_PATH = "/docs";

/**
 * Origin that runs the docs bundle. Supplied by the deployment, never hardcoded:
 * a Fly app name is instance infrastructure, not brand identity. Read lazily so
 * a process that sets it after import — and a test that stubs it — both see it.
 * Unset turns `/docs` into an ordinary 404 rather than a forward to nowhere.
 */
function docsUpstream(): string {
  return process.env.DOCS_UPSTREAM_ORIGIN ?? "";
}

function isLandingLocale(segment: string | undefined): segment is (typeof routing.locales)[number] {
  return Boolean(segment && routing.locales.includes(segment as (typeof routing.locales)[number]));
}

/** Whether a pathname is inside the docs zone (`/docs`, `/docs/...`). */
function isDocsPath(pathname: string): boolean {
  return pathname === DOCS_BASE_PATH || pathname.startsWith(`${DOCS_BASE_PATH}/`);
}

/**
 * The upstream URL that serves a docs request, or null when the path is not
 * documentation.
 *
 * A rewrite target, not a redirect: the visitor stays on this host and the
 * address bar keeps saying `/docs`. That is the whole point of dropping the
 * subdomain — docs belong to the site that documents them.
 */
export function createDocsRewriteUrl(requestUrl: URL): URL | null {
  const upstream = docsUpstream();
  if (!upstream) {
    return null;
  }

  // `/docsearch` is not documentation. Comparing whole segments rather than
  // prefixes is what keeps it out.
  if (!isDocsPath(requestUrl.pathname)) {
    return null;
  }

  const target = new URL(upstream);
  target.pathname = requestUrl.pathname;
  target.search = requestUrl.search;

  return target;
}

/**
 * Where a locale-prefixed docs path belongs, or null when it is not one.
 *
 * `/<landing locale>/docs/<slug>` is the shape this site used before docs became
 * a zone, and the shape a locale switcher on a docs page would produce. The zone
 * runs a narrower locale axis than the marketing site — `["en", "zh"]` with the
 * default hidden (apps/sailor-docs/src/lib/i18n.ts) — so the landing route
 * locale is translated to the zone's content locale, and dropped entirely when
 * it is the zone's default.
 *
 * A redirect, not a rewrite, and that asymmetry is deliberate: the canonical
 * docs URL is the zone's own, so a visitor arriving on the old shape should end
 * up holding the canonical one rather than seeing two addresses for one page.
 * A redirect is safe here where it is not safe inside the zone, because this
 * Location is written in *this* app's path space.
 */
export function createDocsLocaleRedirectPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (!isLandingLocale(segments[0]) || segments[1] !== "docs") {
    return null;
  }

  const contentLocale = toContentLocale(segments[0]);
  const rest = segments.slice(2);
  const zoneSegments = [
    "docs",
    // The zone hides its default locale, so emitting it would produce a URL the
    // zone itself would redirect away from — a chain this app can avoid.
    ...(contentLocale === DOCS_DEFAULT_LOCALE ? [] : [contentLocale]),
    ...rest,
  ];

  return `/${zoneSegments.join("/")}`;
}

/**
 * The docs zone's default locale, which it keeps out of its URLs.
 *
 * Duplicated rather than imported: this app must not depend on the docs bundle's
 * source, and one string is a cheaper coupling than a build-time import across
 * two deployments. Guarded by tests/architecture/docs-rewrite-seam.test.ts,
 * which reads both files and fails if they disagree.
 */
const DOCS_DEFAULT_LOCALE = "en";
