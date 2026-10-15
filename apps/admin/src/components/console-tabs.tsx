"use client";

import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface ConsoleTab {
  href: string;
  label: string;
  count?: number | undefined;
}

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function ConsoleTabs({ tabs }: { tabs: ConsoleTab[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Console" className="border-border border-b bg-card">
      <div className="mx-auto flex max-w-wide items-center overflow-x-auto px-1 [scrollbar-width:none] sm:px-3">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href);
          const body = (
            <>
              {tab.label}
              {tab.count !== undefined ? (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs text-muted-foreground leading-4 tabular-nums">
                  {tab.count}
                </span>
              ) : null}
            </>
          );
          const className = cn(
            "-mb-px flex h-10 shrink-0 items-center whitespace-nowrap border-b-2 px-3 text-sm leading-5 transition-colors hover:text-foreground",
            active
              ? "border-foreground font-medium text-foreground"
              : "font-medium border-transparent text-muted-foreground",
          );
          return (
            <Link
              key={tab.label}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={className}
            >
              {body}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
