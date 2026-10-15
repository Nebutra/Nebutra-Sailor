"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const NAV_ITEMS = [
  { href: "/settings", label: "General" },
  { href: "/settings/account", label: "Account" },
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
  const tc = useTranslations("copy.settingsSettingsNav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={tc("settingsNavigation")}
      className="-mx-4 overflow-x-auto px-4 md:mx-0 md:w-44 md:shrink-0 md:overflow-visible md:px-0"
    >
      {/* Responsive: Scroll — a horizontal strip below md, a rail from md up. */}
      <ul className="flex gap-1 md:block md:space-y-0.5">
        {NAV_ITEMS.map(({ href, label }) => {
          const isActive =
            href === "/settings" ? /\/settings$/.test(pathname) : pathname.includes(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`block whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-neutral-3 font-medium text-neutral-12"
                    : "font-medium text-neutral-11 hover:bg-neutral-2 hover:text-neutral-12"
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
