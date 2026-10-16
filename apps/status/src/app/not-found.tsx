import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/page-shell";
import { requestLocale } from "@/lib/request-locale";

export default async function NotFound() {
  const locale = await requestLocale(undefined, ["zh-CN", "en"]);
  const t = await getTranslations({ locale, namespace: "notFound" });
  return (
    <PageShell locale={locale} page={null} path="/">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("body")}</p>
      <a
        href="/"
        className="mt-6 inline-block text-sm text-foreground underline underline-offset-4"
      >
        {t("home")}
      </a>
    </PageShell>
  );
}
