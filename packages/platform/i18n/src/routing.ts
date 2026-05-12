import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "zh"],
  defaultLocale: "en",
  // Use "always" instead of "as-needed" to avoid next-intl's internal rewrite
  // of /<page> → /<defaultLocale>/<page>. Under Next.js 16 standalone behind
  // nginx (X-Forwarded-Proto: https + listen host 127.0.0.1:3000), the
  // internal rewrite fetch becomes `https://localhost:3000/...` which the
  // local server (http-only) rejects with EPROTO ssl3_get_record. Result:
  // every default-locale URL returned 500 in prod.
  //
  // With "always" the middleware issues a 307 REDIRECT (which goes back
  // through nginx with the correct host/protocol) instead of an internal
  // rewrite (which uses the listen address). Direct hits on /en/* and /zh/*
  // bypass the redirect entirely and render normally.
  localePrefix: "always",
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
