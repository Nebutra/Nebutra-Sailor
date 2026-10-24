import { cn } from "@nebutra/ui/utils";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UpdateForm } from "@/components/admin/update-form";
import { LocalTime } from "@/components/local-time";
import { impactFill } from "@/components/state-style";
import { adminLocale, pickPage, requireMember, workspacePages } from "@/lib/admin";
import { pageComponents, pageIncident } from "@/lib/admin-data";
import { pageLocales, pickI18n } from "@/lib/locale";
import { requestTimeZone } from "@/lib/request-locale";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminIncidentPage({ params, searchParams }: Props) {
  const member = await requireMember();
  const locale = await adminLocale();
  const timeZone = await requestTimeZone();
  const t = await getTranslations({ locale });
  const { id } = await params;
  const page = pickPage(await workspacePages(member.workspaceId), (await searchParams).page);
  if (!page) notFound();
  const incident = await pageIncident(page.id, id);
  if (!incident) notFound();
  const components = await pageComponents(page.id);
  const names = incident.componentKeys.map((k) => {
    const c = components.find((x) => x.key === k);
    return c ? pickI18n(c.name, c.nameI18n as Record<string, string> | null, locale) : k;
  });
  const locales = pageLocales(page.locales);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <div className="min-w-0">
        <a
          href={`/admin/incidents?page=${page.slug}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t("admin.detail.back")}
        </a>
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span
            aria-hidden
            className={cn(
              "size-2 rounded-full",
              incident.kind === "maintenance" ? "bg-blue-700" : impactFill[incident.impact],
            )}
          />
          {incident.kind === "maintenance"
            ? t(`maintenance.${incident.phase ?? "scheduled"}`)
            : `${t(`incidentStatus.${incident.status}`)} · ${t(`impact.${incident.impact}`)}`}
        </p>
        <h1 className="mt-1.5 text-lg font-semibold tracking-tight">{incident.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {names.join(locale === "zh-CN" ? "、" : ", ")}
        </p>
        <a
          href={`/p/${page.slug}/incidents/${incident.id}`}
          className="mt-2 inline-block text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {t("admin.detail.public")}
        </a>

        <h2 className="mt-8 text-sm font-medium">{t("admin.detail.timeline")}</h2>
        <ol className="mt-3 divide-y divide-border rounded-lg border border-border">
          {[...incident.updates].reverse().map((u, index) => (
            <li key={`${u.createdAt.toISOString()}-${index}`} className="px-4 py-3">
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-medium">
                  {t(`incidentStatus.${u.status}` as "incidentStatus.resolved")}
                </span>
                <LocalTime
                  iso={u.createdAt.toISOString()}
                  locale={locale}
                  timeZone={timeZone}
                  className="text-xs tabular-nums text-muted-foreground"
                />
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">{u.message}</p>
              {u.messageI18n
                ? Object.entries(u.messageI18n).map(([l, m]) => (
                    <p
                      key={l}
                      lang={l}
                      className="mt-1 whitespace-pre-line text-sm text-muted-foreground"
                    >
                      <span className="mr-1.5 font-mono text-[11px] uppercase">{l}</span>
                      {m}
                    </p>
                  ))
                : null}
            </li>
          ))}
        </ol>
      </div>
      <aside className="lg:pt-10">
        <h2 className="text-sm font-medium">{t("admin.update.title")}</h2>
        <div className="mt-4">
          <UpdateForm
            page={page.slug}
            id={incident.id}
            kind={incident.kind}
            status={incident.status}
            locales={locales}
          />
        </div>
      </aside>
    </div>
  );
}
