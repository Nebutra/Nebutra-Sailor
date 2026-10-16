import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/admin/actions";
import type { AppLocale } from "@/lib/locale";
import { AdminLanguage, AdminNav } from "./admin-nav";

/** Console frame: product mark, sections, the member, language and sign-out. Dense, quiet. */
export async function AdminShell({
  locale,
  email,
  children,
}: {
  locale: AppLocale;
  email: string;
  children: ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: "admin" });
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-border px-4 sm:px-6">
        <div className="mx-auto flex h-14 w-full max-w-content items-center gap-6">
          <a href="/admin/incidents" className="shrink-0 text-sm font-semibold tracking-tight">
            Nebutra Status
          </a>
          <AdminNav
            items={[
              { href: "/admin/incidents", label: t("nav.incidents") },
              { href: "/admin/keys", label: t("nav.keys") },
              { href: "/admin/components", label: t("nav.components") },
            ]}
          />
          <div className="ml-auto flex items-center gap-3 text-sm">
            <AdminLanguage locale={locale} label={t("lang")} />
            <span className="hidden max-w-48 truncate text-xs text-muted-foreground md:inline">
              {email}
            </span>
            <form action={signOutAction}>
              <button type="submit" className="text-xs text-muted-foreground hover:text-foreground">
                {t("nav.signOut")}
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 px-4 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-content">{children}</div>
      </main>
    </div>
  );
}
