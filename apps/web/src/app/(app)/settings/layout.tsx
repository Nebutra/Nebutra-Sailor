import { PageHeader } from "@nebutra/ui/layout";
import type { ReactNode } from "react";
import { SettingsNav } from "./settings-nav";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Settings" description="Manage your organization and account settings" />

      <div className="mt-8 flex gap-8">
        <SettingsNav />

        {/* Page content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
