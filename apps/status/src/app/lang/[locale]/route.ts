/**
 * The language switch: remembers the choice in a cookie and returns the
 * reader to the page they were on, so every later link keeps the language.
 */
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/locale";
import { safeNext } from "@/lib/time-zone";

export async function GET(request: Request, context: { params: Promise<{ locale: string }> }) {
  const { locale } = await context.params;
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const chosen = normalizeLocale(locale);
  const headers = new Headers({ location: next, "cache-control": "no-store" });
  if (chosen) {
    headers.append(
      "set-cookie",
      `${LOCALE_COOKIE}=${chosen}; Path=/; Max-Age=31536000; SameSite=Lax`,
    );
  }
  return new Response(null, { status: 303, headers });
}
