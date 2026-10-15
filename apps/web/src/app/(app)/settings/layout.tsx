import { PageHeader } from "@nebutra/ui/layout";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { SettingsNav } from "./settings-nav";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const tc = useTranslations("copy.settingsLayout");
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={tc("settings")} description={tc("manageYourOrganizationAnd")} />

      <div className="mt-6 flex flex-col gap-6 md:mt-8 md:flex-row md:gap-8">
        <SettingsNav />

        {/* Page content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
