import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HistoryRoute } from "@/components/routes";
import { getSnapshot } from "@/lib/data";
import type { SlugProps } from "@/lib/page-params";
import { requestLocale } from "@/lib/request-locale";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }: SlugProps): Promise<Metadata> {
  const { slug } = await params;
  const snapshot = await getSnapshot(slug);
  if (!snapshot) return {};
  const locale = await requestLocale((await searchParams).lang, snapshot.page.locales);
  const t = await getTranslations({ locale, namespace: "history" });
  return { title: `${t("title")} · ${snapshot.page.title}` };
}

export default async function HistoryPage({ params, searchParams }: SlugProps) {
  const { slug } = await params;
  return <HistoryRoute slug={slug} query={await searchParams} />;
}
