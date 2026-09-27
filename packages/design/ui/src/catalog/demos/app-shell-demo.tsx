"use client";

import { Layers, Layout, Users } from "@nebutra/icons";
import { AppShell, PageHeader } from "@nebutra/ui/layout";
import { SidebarNav } from "@nebutra/ui/patterns";

export function AppShellDemo() {
  return (
    <div className="h-[460px] w-full overflow-hidden rounded-[var(--radius-lg)] border border-border">
      <AppShell
        sidebar={
          <SidebarNav
            sections={[
              {
                id: "main",
                items: [
                  { id: "overview", label: "Overview", href: "#", icon: Layout, isActive: true },
                  { id: "projects", label: "Projects", href: "#", icon: Layers },
                  { id: "team", label: "Team", href: "#", icon: Users },
                ],
              },
            ]}
          />
        }
      >
        <div className="p-6">
          <PageHeader title="Overview" description="What changed across your projects this week." />
        </div>
      </AppShell>
    </div>
  );
}
