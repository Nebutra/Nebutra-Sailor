"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const NAV_ITEMS = [
  { href: "/settings", labelKey: "general" },
  { href: "/settings/account", labelKey: "account" },
  { href: "/settings/appearance", labelKey: "appearance" },
  { href: "/settings/security", labelKey: "security" },
  { href: "/settings/team", labelKey: "team" },
  { href: "/settings/developers", labelKey: "openPlatform" },
  { href: "/settings/api-keys", labelKey: "apiKeys" },
  { href: "/settings/provider-keys", labelKey: "providerKeys" },
  { href: "/settings/webhooks", labelKey: "webhooks" },
  { href: "/settings/notifications", labelKey: "notifications" },
  { href: "/settings/referrals", labelKey: "referrals" },
  { href: "/settings/shortcuts", labelKey: "shortcuts" },
  { href: "/settings/audit-log", labelKey: "auditLog" },
  { href: "/billing", labelKey: "billing" },
];

export function SettingsNav() {
  const tNav = useTranslations("Sidebar.nav");
  const tc = useTranslations("copy.settingsSettingsNav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={tc("settingsNavigation")}
      className="-mx-4 overflow-x-auto px-4 md:mx-0 md:w-44 md:shrink-0 md:overflow-visible md:px-0"
    >
      {/* Responsive: Scroll — a horizontal strip below md, a rail from md up. */}
      <ul className="flex gap-1 md:block md:space-y-0.5">
        {NAV_ITEMS.map(({ href, labelKey }) => {
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
                {tNav(labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
