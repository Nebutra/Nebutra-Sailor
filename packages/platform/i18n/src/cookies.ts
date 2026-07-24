export const LOCALE_COOKIE = "NEXT_LOCALE";
export const MARKET_COOKIE = "NEXT_MARKET";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function cookieDomainSuffix(): string {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname.toLowerCase();
  if (host === "nebutra.com" || host.endsWith(".nebutra.com")) return "; Domain=.nebutra.com";
  if (host === "nebutra.org" || host.endsWith(".nebutra.org")) return "; Domain=.nebutra.org";
  return "";
}

function writeCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${cookieDomainSuffix()}`;
}

export function setLocaleCookie(locale: string): void {
  writeCookie(LOCALE_COOKIE, locale);
}

export function setMarketCookie(country: string): void {
  writeCookie(MARKET_COOKIE, country.toUpperCase());
}

export function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  for (const part of document.cookie.split(";").map((p) => p.trim())) {
    if (part.startsWith(`${name}=`)) return decodeURIComponent(part.slice(name.length + 1));
  }
  return undefined;
}

export function readMarketCookie(): string | undefined {
  const v = readCookie(MARKET_COOKIE);
  return v ? v.toUpperCase() : undefined;
}

export function readLocaleCookie(): string | undefined {
  return readCookie(LOCALE_COOKIE);
}
