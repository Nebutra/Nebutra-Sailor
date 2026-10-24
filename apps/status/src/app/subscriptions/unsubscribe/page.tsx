import { Button } from "@nebutra/ui/primitives";
import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/page-shell";
import { SubscriptionResult } from "@/components/subscription-result";
import { requestLocale } from "@/lib/request-locale";
import { subscriberPage } from "@/lib/subscription";
import { unsubscribeAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function UnsubscribePage({ searchParams }: Props) {
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : "";
  const done = query.done;
  const page = await subscriberPage(token);
  const locale = await requestLocale(undefined, page?.locales ?? ["zh-CN", "en"]);
  const t = await getTranslations({ locale, namespace: "subscription" });
  const back = { href: page ? `/p/${page.slug}` : "/", label: t("back") };
  const path = `/subscriptions/unsubscribe?token=${encodeURIComponent(token)}`;
  return (
    <PageShell locale={locale} page={page} path={path}>
      {!page || done === "0" ? (
        <SubscriptionResult
          ok={false}
          title={t("invalidTitle")}
          body={t("invalidBody")}
          back={back}
        />
      ) : done === "1" ? (
        <SubscriptionResult
          ok
          title={t("unsubscribedTitle")}
          body={t("unsubscribedBody")}
          back={back}
        />
      ) : (
        <SubscriptionResult
          ok={false}
          title={t("unsubscribeTitle")}
          body={t("unsubscribeBody")}
          back={back}
        >
          <form action={unsubscribeAction}>
            <input data-allow-native type="hidden" name="token" value={token} />
            <Button type="submit" variant="ink" size="sm">
              {t("unsubscribeButton")}
            </Button>
          </form>
        </SubscriptionResult>
      )}
    </PageShell>
  );
}
