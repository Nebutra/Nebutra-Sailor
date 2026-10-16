import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/page-shell";
import { PageList } from "@/components/routes";
import { databaseConfigured } from "@/lib/data";
import { requestLocale } from "@/lib/request-locale";
import { getDb } from "@/server/db";

/** Unknown page or incident: say so, and offer every way back. */
export default async function NotFound() {
  const locale = await requestLocale(undefined, ["zh-CN", "en"]);
  const t = await getTranslations({ locale, namespace: "notFound" });
  const pages = databaseConfigured()
    ? await getDb()
        .page.findMany({
          select: { slug: true, title: true },
          orderBy: { createdAt: "asc" },
          take: 20,
        })
        .catch(() => [])
    : [];
  return (
    <PageShell locale={locale} page={null} path="/">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("body")}</p>
      <a
        href="/"
        className="mt-6 inline-flex rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-muted"
      >
        {t("home")}
      </a>
      {pages.length > 1 ? <PageList pages={pages} /> : null}
    </PageShell>
  );
}
