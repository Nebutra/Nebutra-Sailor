import type { ReactNode } from "react";
import { SettingsNav } from "./settings-nav";

/**
 * Settings: the section rail and the section. Each page renders its own
 * section-sized header (`SettingsPageHeader` or `PageHeader size="section"`),
 * so the parent's title is not repeated at page size above every child.
 */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-content">
      <div className="flex flex-col gap-6 md:flex-row md:gap-12">
        <SettingsNav />

        {/* Page content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
