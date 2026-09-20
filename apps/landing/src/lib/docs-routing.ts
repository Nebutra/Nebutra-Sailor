import { toContentLocale } from "@nebutra/i18n/locales";
import { routing } from "@/i18n/routing";

/**
 * Where the docs bundle is served from, as an origin to proxy — not a public
 * address.
 *
 * Documentation used to live on its own subdomain and /docs 302'd there, so
 * the product's own host was never where its documentation lived. It is a path
 * now — `<site>/docs` — and each product app serves its own at the same path.
 * The bundle still runs as a separate deployment; this points at it so landing
 * can rewrite rather than redirect, and the visitor never leaves the site.
 *
 * Supplied by the deployment, not hardcoded here: `brand.domains.docsOrigin`
 * is emitted as this variable by scripts/brand-vercel-env.ts. Read lazily so a
 * process that sets it after import — and a test that stubs it — both see it.
 * Unset turns /docs into an ordinary 404 rather than a rewrite to nowhere.
 */
function docsUpstream(): string {
  return process.env.DOCS_UPSTREAM_ORIGIN ?? "";
}

function isLandingLocale(segment: string | undefined): segment is (typeof routing.locales)[number] {
  return Boolean(segment && routing.locales.includes(segment as (typeof routing.locales)[number]));
}

/**
 * The upstream URL that serves a `/docs` request, or null when the path is not
 * documentation.
 *
 * Returns a rewrite target, not a redirect: the address bar keeps saying
 * `<site>/docs`. That is the whole point of dropping the subdomain — docs
 * belong to the site that documents them.
 */
export function createDocsRewriteUrl(requestUrl: URL): URL | null {
  const upstream = docsUpstream();
  if (!upstream) {
    return null;
  }

  const segments = requestUrl.pathname.split("/").filter(Boolean);
  let locale: string | undefined;
  let docsIndex = -1;

  if (segments[0] === "docs") {
    docsIndex = 0;
  } else if (isLandingLocale(segments[0]) && segments[1] === "docs") {
    locale = segments[0];
    docsIndex = 1;
  }

  if (docsIndex === -1) {
    return null;
  }

  const trailingSegments = segments.slice(docsIndex + 1);

  // The docs origin runs its own, narrower locale axis: `i18n.languages` there is
  // ["en", "zh"] with `parser: "dir"` (apps/sailor-docs/src/lib/i18n.ts), and its
  // routes are /<lang>/<slug>. So translate the landing *route* locale into the
  // docs origin's *content* locale — zh-Hans and zh-Hant both land on "zh", every
  // other route locale on "en" — instead of testing a hardcoded set that could
  // never contain a multi-script tag.
  //
  // The prefix is always emitted (never dropped for the default locale) so
  // landing does not hand visitors a redirect chain: sailor-docs 301s "/" → "/en"
  // (apps/sailor-docs/next.config.ts).
  const docsSegments = [toContentLocale(locale), ...trailingSegments];

  const target = new URL(upstream);
  target.pathname = `/${docsSegments.join("/")}`;
  target.search = requestUrl.search;

  return target;
}
