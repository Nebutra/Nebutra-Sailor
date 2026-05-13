"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/settings", label: "General" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/api-keys", label: "API Keys" },
  { href: "/settings/webhooks", label: "Webhooks" },
  { href: "/settings/notifications", label: "Notifications" },
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
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-neutral-2 font-medium text-neutral-12 dark:bg-white/10 dark:text-white"
                    : "text-neutral-11 hover:bg-neutral-2 hover:text-neutral-12 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
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
