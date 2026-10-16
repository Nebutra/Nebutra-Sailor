import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/page-shell";
import { SubscriptionResult } from "@/components/subscription-result";
import { requestLocale } from "@/lib/request-locale";
import { subscriberPage } from "@/lib/subscription";
import { getDb } from "@/server/db";
import { confirmSubscription } from "@/server/notify/outbox";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Double opt-in landing: confirms on open, like the API route it mirrors. */
export default async function ConfirmPage({ searchParams }: Props) {
  const raw = (await searchParams).token;
  const token = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
  const page = await subscriberPage(token);
  const ok = page ? await confirmSubscription(getDb(), token) : false;
  const locale = await requestLocale(undefined, page?.locales ?? ["zh-CN", "en"]);
  const t = await getTranslations({ locale, namespace: "subscription" });
  const path = `/subscriptions/confirm?token=${encodeURIComponent(token)}`;
  return (
    <PageShell locale={locale} page={page} path={path}>
      <SubscriptionResult
        ok={ok}
        title={t(ok ? "confirmTitle" : "invalidTitle")}
        body={t(ok ? "confirmBody" : "invalidBody")}
        back={{ href: page ? `/p/${page.slug}` : "/", label: t("back") }}
      />
    </PageShell>
  );
}
