import { getTranslations } from "next-intl/server";
import { CreateKeyForm, RevokeKeyButton } from "@/components/admin/key-forms";
import { LocalTime } from "@/components/local-time";
import { adminLocale, requireMember } from "@/lib/admin";
import { requestTimeZone } from "@/lib/request-locale";
import { API_KEY_SCOPES, canManageKeys, listApiKeys } from "@/server/auth";
import { getDb } from "@/server/db";

export default async function KeysPage() {
  const member = await requireMember();
  const locale = await adminLocale();
  const timeZone = await requestTimeZone();
  const t = await getTranslations({ locale, namespace: "admin.keys" });
  if (!canManageKeys(member)) {
    return <p className="text-sm text-muted-foreground">{t("forbidden")}</p>;
  }
  const keys = await listApiKeys(getDb(), member.workspaceId);
  return (
    <div>
      <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("body")}</p>
      <div className="mt-6 rounded-lg border border-border p-4 sm:p-5">
        <CreateKeyForm scopes={API_KEY_SCOPES} />
      </div>
      {keys.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          {t("quiet")}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2 font-normal">
                  {t("name")}
                </th>
                <th scope="col" className="px-4 py-2 font-normal">
                  {t("prefix")}
                </th>
                <th scope="col" className="px-4 py-2 font-normal">
                  {t("scopes")}
                </th>
                <th scope="col" className="px-4 py-2 font-normal">
                  {t("lastUsed")}
                </th>
                <th scope="col" className="px-4 py-2 font-normal">
                  {t("createdAt")}
                </th>
                <th scope="col" className="px-4 py-2">
                  <span className="sr-only">{t("revoke")}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {keys.map((k) => (
                <tr key={k.id} className={k.revokedAt ? "text-muted-foreground" : undefined}>
                  <td className="px-4 py-2.5 font-medium">{k.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{k.prefix}…</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{k.scopes.join(" ")}</td>
                  <td className="px-4 py-2.5 text-xs tabular-nums">
                    {k.lastUsedAt ? (
                      <LocalTime
                        iso={k.lastUsedAt.toISOString()}
                        locale={locale}
                        timeZone={timeZone}
                      />
                    ) : (
                      t("never")
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs tabular-nums">
                    <LocalTime
                      iso={k.createdAt.toISOString()}
                      locale={locale}
                      timeZone={timeZone}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {k.revokedAt ? (
                      <span className="text-xs">{t("revoked")}</span>
                    ) : (
                      <RevokeKeyButton id={k.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
