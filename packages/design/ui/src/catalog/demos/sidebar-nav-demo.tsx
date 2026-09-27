"use client";

import { Envelope, Layers, Layout, SettingsGear, Users } from "@nebutra/icons";
import { SidebarNav } from "@nebutra/ui/patterns";

export function SidebarNavDemo() {
  return (
    <div className="h-[420px] w-64 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background">
      <SidebarNav
        sections={[
          {
            id: "main",
            items: [
              { id: "overview", label: "Overview", href: "#", icon: Layout, isActive: true },
              {
                id: "projects",
                label: "Projects",
                href: "#",
                icon: Layers,
                badge: { label: "New", tone: "new" },
              },
              { id: "team", label: "Team", href: "#", icon: Users },
            ],
          },
          {
            id: "settings",
            label: "Settings",
            items: [{ id: "general", label: "General", href: "#", icon: SettingsGear }],
          },
        ]}
        footerItems={[{ id: "support", label: "Contact support", href: "#", icon: Envelope }]}
      />
    </div>
  );
}
