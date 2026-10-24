import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { IncidentForm } from "@/components/admin/incident-form";
import { adminLocale, pickPage, requireMember, workspacePages } from "@/lib/admin";
import { pageComponents } from "@/lib/admin-data";
import { pageLocales, pickI18n } from "@/lib/locale";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function NewIncidentPage({ searchParams }: Props) {
  const member = await requireMember();
  const locale = await adminLocale();
  const t = await getTranslations({ locale, namespace: "admin" });
  const page = pickPage(await workspacePages(member.workspaceId), (await searchParams).page);
  if (!page) notFound();
  const components = await pageComponents(page.id);
  return (
    <div className="max-w-2xl">
      <a
        href={`/admin/incidents?page=${page.slug}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        {t("detail.back")}
      </a>
      <h1 className="mt-4 text-lg font-semibold tracking-tight">{t("incidents.new")}</h1>
      <div className="mt-6">
        <IncidentForm
          page={page.slug}
          locales={pageLocales(page.locales)}
          components={components.map((c) => ({
            key: c.key,
            name: pickI18n(c.name, c.nameI18n as Record<string, string> | null, locale),
            group: c.group?.name ?? null,
          }))}
        />
      </div>
    </div>
  );
}
