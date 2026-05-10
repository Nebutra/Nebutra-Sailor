"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../utils/cn";
import { buttonVariants } from "./button";

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    href: string;
    title: string;
    icon?: React.ReactNode;
  }[];
}

export function SettingsSidebarNav({ className, items, ...props }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn("flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1", className)}
      {...props}
    >
      {items.map((item) => {
        // Ensure href has locale prefix if needed for comparison,
        // or just compare the suffix if we want to be looser.
        // Assuming item.href passed in includes locale or we handle it here.
        // Let's assume items passed in are relative to app root (e.g. /zh/settings/...)
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              isActive ? "bg-muted hover:bg-muted" : "hover:bg-transparent hover:underline",
              "justify-start",
            )}
          >
            {item.icon && <span className="mr-2">{item.icon}</span>}
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
