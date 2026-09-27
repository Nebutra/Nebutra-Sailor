/**
 * The Sailor Studio look a visitor last chose, as a cookie on the whole
 * registrable domain — so Studio and the preview site it links to (a sibling
 * subdomain) share it, and the preview site can paint it on the server, in the
 * first frame. Not sensitive: it is a preset code.
 */
export const PRESET_COOKIE = "sailor_preset";

const MAX_AGE = 60 * 60 * 24 * 180;
const CODE = /^[0-9A-Za-z]{1,32}$/;

/** `a.example.com` → `example.com`; localhost and IPs get a host-only cookie. */
function cookieDomain(hostname: string): string | null {
  if (hostname === "localhost" || /^[\d.:]+$/.test(hostname)) return null;
  const labels = hostname.split(".");
  return labels.length >= 2 ? labels.slice(-2).join(".") : null;
}

export function readPresetCookie(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === PRESET_COOKIE) {
      const value = decodeURIComponent(rest.join("="));
      return CODE.test(value) ? value : null;
    }
  }
  return null;
}

/** Browser only. `null` clears it. */
export function writePresetCookie(code: string | null): void {
  if (code !== null && !CODE.test(code)) return;
  const domain = cookieDomain(window.location.hostname);
  const parts = [
    `${PRESET_COOKIE}=${code ?? ""}`,
    "Path=/",
    `Max-Age=${code ? MAX_AGE : 0}`,
    "SameSite=Lax",
    ...(domain ? [`Domain=${domain}`] : []),
    ...(window.location.protocol === "https:" ? ["Secure"] : []),
  ];
  // biome-ignore lint/suspicious/noDocumentCookie: a plain first-party preference cookie shared across subdomains.
  document.cookie = parts.join("; ");
}
