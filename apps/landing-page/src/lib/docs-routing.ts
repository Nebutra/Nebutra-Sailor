import { routing } from "@/i18n/routing";
import { DOCS_ORIGIN_URL } from "./docs-links";

const DOCS_ORIGIN = new URL(process.env.DOCS_ORIGIN_URL ?? DOCS_ORIGIN_URL);
const DOCS_ORIGIN_HOST = DOCS_ORIGIN.hostname;
const DOCS_SUPPORTED_LOCALES = new Set(["en", "zh"]);

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

  const docsSegments =
    locale && locale !== routing.defaultLocale && DOCS_SUPPORTED_LOCALES.has(locale)
      ? [locale, "docs", ...segments.slice(docsIndex + 1)]
      : ["docs", ...segments.slice(docsIndex + 1)];

  const target = new URL(DOCS_ORIGIN);
  target.pathname = `/${docsSegments.join("/")}`;
  target.search = requestUrl.search;

  return target;
}
