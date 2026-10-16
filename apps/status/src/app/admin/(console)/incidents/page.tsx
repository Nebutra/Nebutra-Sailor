import { Plus } from "@nebutra/icons";
import { getTranslations } from "next-intl/server";
import { IncidentTable } from "@/components/admin/incident-table";
import { PageSwitcher } from "@/components/admin/page-switcher";
import { adminLocale, pickPage, requireMember, workspacePages } from "@/lib/admin";
import { pageIncidents, splitOpen } from "@/lib/admin-data";
import { requestTimeZone } from "@/lib/request-locale";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function IncidentsPage({ searchParams }: Props) {
  const member = await requireMember();
  const locale = await adminLocale();
  const timeZone = await requestTimeZone();
  const t = await getTranslations({ locale, namespace: "admin" });
  const pages = await workspacePages(member.workspaceId);
  const page = pickPage(pages, (await searchParams).page);
  if (!page) {
    const th = await getTranslations({ locale, namespace: "home" });
    return (
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{th("emptyTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{th("emptyBody")}</p>
      </div>
    );
  }
  const { open, closed } = splitOpen(await pageIncidents(page.id));
  return (
    <div>
      <PageSwitcher pages={pages} current={page.slug} basePath="/admin/incidents" />
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold tracking-tight">{t("incidents.title")}</h1>
        <a
          href={`/admin/incidents/new?page=${page.slug}`}
          className="inline-flex items-center gap-1.5 rounded-md bg-neutral-12 px-3 py-1.5 text-sm text-neutral-1 hover:bg-neutral-12/90"
        >
          <Plus aria-hidden className="size-4" />
          {t("incidents.new")}
        </a>
      </div>
      <section aria-labelledby="open" className="mt-6">
        <h2 id="open" className="mb-2 text-xs font-medium text-muted-foreground">
          {t("incidents.open")} · {open.length}
        </h2>
        {open.length > 0 ? (
          <IncidentTable incidents={open} page={page.slug} locale={locale} timeZone={timeZone} />
        ) : (
          <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            {t("incidents.quietOpen")}
          </p>
        )}
      </section>
      <section aria-labelledby="closed" className="mt-8">
        <h2 id="closed" className="mb-2 text-xs font-medium text-muted-foreground">
          {t("incidents.closed")} · {closed.length}
        </h2>
        {closed.length > 0 ? (
          <IncidentTable incidents={closed} page={page.slug} locale={locale} timeZone={timeZone} />
        ) : (
          <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            {t("incidents.quietClosed")}
          </p>
        )}
      </section>
    </div>
  );
}
