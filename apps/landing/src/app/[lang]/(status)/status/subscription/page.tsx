import { confirmSubscription, unsubscribe } from "@nebutra/status";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { StatusPageSkeleton, StatusShell } from "@/components/status/status-page-view";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { unpublishedSet } from "@/lib/seo/site-routes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "statusPages.subscription" });
  const path = "/status/subscription";
  return buildPageMetadata({
    title: t("meta.title"),
    description: t("meta.title"),
    path,
    locale: lang,
    publishedIn: unpublishedSet(path),
  });
}

type Search = Promise<{ action?: string; token?: string }>;

export default async function SubscriptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Search;
}) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);
  return (
    <Suspense fallback={<StatusPageSkeleton />}>
      <SubscriptionResult lang={lang} searchParams={searchParams} />
    </Suspense>
  );
}

async function SubscriptionResult({ lang, searchParams }: { lang: string; searchParams: Search }) {
  await connection();
  const { action, token } = await searchParams;
  const t = await getTranslations({ locale: lang, namespace: "statusPages.subscription" });
  let title = t("invalid.title");
  let body = t("invalid.body");

  if (token && action === "confirm") {
    const subscriber = await confirmSubscription(token);
    if (subscriber) {
      title = t("confirmed.title");
      body = t("confirmed.body", { email: subscriber.email });
    }
  } else if (token && action === "unsubscribe") {
    if (await unsubscribe(token)) {
      title = t("unsubscribed.title");
      body = t("unsubscribed.body");
    }
  }

  return (
    <StatusShell>
      <div className="rounded-xl border border-border px-6 py-8 text-center">
        <h1 className="text-lg font-medium tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
        <Link
          href="/status"
          className="mt-6 inline-block text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t("backToStatus")}
        </Link>
      </div>
    </StatusShell>
  );
}
