import { cn } from "@nebutra/ui/utils";
import { getTranslations } from "next-intl/server";
import { PageSwitcher } from "@/components/admin/page-switcher";
import { StateIcon } from "@/components/state-icon";
import { adminLocale, pickPage, requireMember, workspacePages } from "@/lib/admin";
import { pickI18n } from "@/lib/locale";
import { getDb } from "@/server/db";
import { buildPageSnapshot } from "@/server/snapshot";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Read-only: components are configuration as code. Includes internal ones, which the public page hides. */
export default async function ComponentsPage({ searchParams }: Props) {
  const member = await requireMember();
  const locale = await adminLocale();
  const t = await getTranslations({ locale });
  const pages = await workspacePages(member.workspaceId);
  const page = pickPage(pages, (await searchParams).page);
  const snapshot = page
    ? await buildPageSnapshot(getDb(), { id: page.id }, { includeInternal: true })
    : null;
  const groupName = (key: string | null) => {
    const g = snapshot?.groups.find((x) => x.key === key);
    return g ? pickI18n(g.name, g.nameI18n, locale) : "—";
  };
  return (
    <div>
      {page ? (
        <PageSwitcher pages={pages} current={page.slug} basePath="/admin/components" />
      ) : null}
      <h1 className="text-lg font-semibold tracking-tight">{t("admin.components.title")}</h1>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t("admin.components.body")}
      </p>
      {snapshot ? (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2 font-normal">
                  {t("admin.components.name")}
                </th>
                <th scope="col" className="px-4 py-2 font-normal">
                  {t("admin.components.key")}
                </th>
                <th scope="col" className="px-4 py-2 font-normal">
                  {t("admin.components.group")}
                </th>
                <th scope="col" className="px-4 py-2 font-normal">
                  {t("admin.components.state")}
                </th>
                <th scope="col" className="px-4 py-2 font-normal">
                  {t("admin.components.evidence")}
                </th>
                <th scope="col" className="px-4 py-2 font-normal">
                  {t("admin.components.visibility")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {snapshot.components.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2.5 font-medium">
                    {pickI18n(c.name, c.nameI18n, locale)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{c.key}</td>
                  <td className="px-4 py-2.5 text-xs">{groupName(c.groupKey)}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <StateIcon state={c.verdict.state} className="size-3.5" />
                      {t(`state.${c.verdict.state}`)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {t("admin.components.sources", { count: c.verdict.evidence.length })}
                    {c.verdict.coverage.length > 0 ? ` · ${c.verdict.coverage.join(", ")}` : ""}
                  </td>
                  <td
                    className={cn("px-4 py-2.5 text-xs", c.isPublic ? "" : "text-muted-foreground")}
                  >
                    {c.isPublic ? t("admin.components.public") : t("admin.components.internal")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
