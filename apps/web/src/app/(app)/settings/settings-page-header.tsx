import { PageHeader } from "@nebutra/ui/layout";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

export type SettingsSectionKey = "general" | "account" | "appearance" | "security" | "team";

/**
 * The header of one settings section. The settings layout no longer repeats
 * a full-size "Settings" title over every child: the shell breadcrumb carries
 * "Settings /", the rail carries position, and each page names itself at the
 * section size (Linear, Vercel).
 */
export async function SettingsPageHeader({
  section,
  actions,
}: {
  section: SettingsSectionKey;
  actions?: ReactNode;
}) {
  const [tNav, tc] = await Promise.all([
    getTranslations("Sidebar.nav"),
    getTranslations("copy.settingsLayout.sections"),
  ]);
  return (
    <PageHeader size="section" title={tNav(section)} description={tc(section)} actions={actions} />
  );
}
