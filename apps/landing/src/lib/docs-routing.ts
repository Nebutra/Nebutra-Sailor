import { toContentLocale } from "@nebutra/i18n/locales";
import { routing } from "@/i18n/routing";
import { DOCS_ORIGIN_URL } from "./docs-links";

const DOCS_ORIGIN = new URL(process.env.DOCS_ORIGIN_URL ?? DOCS_ORIGIN_URL);
const DOCS_ORIGIN_HOST = DOCS_ORIGIN.hostname;

function normalizeHost(host?: string | null): string {
  return (host ?? "").split(":")[0]?.toLowerCase() ?? "";
}

function isLandingLocale(segment: string | undefined): segment is (typeof routing.locales)[number] {
  return Boolean(segment && routing.locales.includes(segment as (typeof routing.locales)[number]));
}

export function createDocsRedirectUrl(requestUrl: URL, requestHost?: string | null): URL | null {
  if (normalizeHost(requestHost ?? requestUrl.host) === DOCS_ORIGIN_HOST) {
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

  const target = new URL(DOCS_ORIGIN);
  target.pathname = `/${docsSegments.join("/")}`;
  target.search = requestUrl.search;

  return target;
}
