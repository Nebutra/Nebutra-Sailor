"use client";

import {
  Clock,
  FileText,
  FolderOpen,
  LayoutDashboard,
  type LucideIcon,
  MessageSquare,
  Star,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/projects", label: "Projects", icon: FolderOpen, exact: false },
  { href: "/admin/articles", label: "Articles", icon: FileText, exact: false },
  { href: "/admin/guestbook", label: "Guestbook", icon: MessageSquare, exact: false },
  { href: "/admin/feedback", label: "Feedback", icon: Star, exact: false },
  { href: "/admin/now", label: "Now", icon: Clock, exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-4">
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact
            ? pathname === href || /^\/[a-z]{2}\/admin$/.test(pathname)
            : pathname.includes(href);

          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "border-l-2 border-gray-900 dark:border-white pl-[10px] font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
