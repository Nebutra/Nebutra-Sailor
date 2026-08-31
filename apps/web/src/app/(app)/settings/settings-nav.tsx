"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/settings", label: "General" },
  { href: "/settings/appearance", label: "Appearance" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/developers", label: "Open Platform" },
  { href: "/settings/api-keys", label: "API Keys" },
  { href: "/settings/provider-keys", label: "Provider Keys" },
  { href: "/settings/webhooks", label: "Webhooks" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/referrals", label: "Referrals" },
  { href: "/settings/shortcuts", label: "Shortcuts" },
  { href: "/settings/audit-log", label: "Audit Log" },
  { href: "/billing", label: "Billing" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings navigation" className="w-44 shrink-0">
      <ul className="space-y-0.5">
        {NAV_ITEMS.map(({ href, label }) => {
          const isActive =
            href === "/settings" ? /\/settings$/.test(pathname) : pathname.includes(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`block rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-neutral-2 font-medium text-neutral-12"
                    : "text-neutral-11 hover:bg-neutral-2 hover:text-neutral-12"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
