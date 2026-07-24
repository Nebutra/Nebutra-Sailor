import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  setRequestLocale(lang as Locale);

  return {
    title: "Platform — Nebutra",
  };
}

export default async function OPCPage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  setRequestLocale(lang as Locale);

  const target = lang === "en" ? "/about/products" : `/${lang}/about/products`;
  redirect(target);
}
