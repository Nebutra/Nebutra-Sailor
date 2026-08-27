import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  setRequestLocale(lang as Locale);

  // `none` scope: this is a redirect stub to /about/products, so the registry
  // publishes it in zero locales and buildPageMetadata emits noindex,follow.
  return buildPageMetadata({
    title: "Platform — Nebutra",
    description: "Nebutra platform overview.",
    path: "/opc",
    locale: lang as Locale,
  });
}

export default async function OPCPage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  setRequestLocale(lang as Locale);

  const target = lang === "en" ? "/about/products" : `/${lang}/about/products`;
  redirect(target);
}
