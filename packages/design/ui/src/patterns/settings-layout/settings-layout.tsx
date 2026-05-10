"use client";

import { Info, Palette, Settings, User } from "lucide-react";
import { SettingsSidebarNav } from "./components/sidebar-nav";
import { Separator } from "./separator";

interface SettingsLayoutClientProps {
  children: React.ReactNode;
  locale: string;
}

export function SettingsLayoutClient({ children, locale }: SettingsLayoutClientProps) {
  const { t } = useI18n();

  const sidebarNavItems = [
    {
      title: t("settings.nav.general") || "General",
      href: `/${locale}/settings`,
      icon: <Settings className="w-4 h-4" />,
    },
    {
      title: t("settings.nav.appearance") || "Appearance",
      href: `/${locale}/settings/appearance`,
      icon: <Palette className="w-4 h-4" />,
    },
    {
      title: t("settings.nav.profile") || "Profile",
      href: `/${locale}/settings/profile`,
      icon: <User className="w-4 h-4" />,
    },
    {
      title: t("settings.nav.about") || "About",
      href: `/${locale}/settings/about`,
      icon: <Info className="w-4 h-4" />,
    },
  ];

  return (
    <div className="hidden space-y-6 p-10 pb-16 md:block">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">{t("common.settings") || "Settings"}</h2>
        <p className="text-muted-foreground">
          {t("settings.pageDescription") || "Manage your application settings and preferences."}
        </p>
      </div>
      <Separator className="my-6" />
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="lg:w-1/5 shrink-0">
          <SettingsSidebarNav items={sidebarNavItems} />
        </aside>
        <div className="flex-1 lg:max-w-2xl min-w-0">{children}</div>
      </div>
    </div>
  );
}
