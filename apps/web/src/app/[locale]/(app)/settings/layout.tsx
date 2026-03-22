import { PageHeader } from "@nebutra/ui/layout";
import Link from "next/link";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/settings", label: "General" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/api-keys", label: "API Keys" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/security", label: "Security" },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title="Settings" description="Manage your organization and account settings" />

      <div className="mt-8 flex gap-8">
        {/* Sidebar nav */}
        <nav className="w-44 shrink-0">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="block rounded-md px-3 py-2 text-sm text-[var(--neutral-11)] transition-colors hover:bg-[var(--neutral-2)] hover:text-[var(--neutral-12)]"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Page content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
