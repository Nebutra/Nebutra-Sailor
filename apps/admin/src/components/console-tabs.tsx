"use client";

import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface ConsoleTab {
  href: string;
  label: string;
  count?: number | undefined;
  /** Batch 2 surfaces: rendered as inert text so the IA is visible, not clickable. */
  disabled?: boolean;
}

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function ConsoleTabs({ tabs }: { tabs: ConsoleTab[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Console" className="border-border border-b bg-card">
      <div className="mx-auto flex max-w-[1400px] items-center px-3">
        {tabs.map((tab) => {
          const active = !tab.disabled && isActive(pathname, tab.href);
          const body = (
            <>
              {tab.label}
              {tab.count !== undefined ? (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground leading-4">
                  {tab.count}
                </span>
              ) : null}
            </>
          );
          const className = cn(
            "-mb-px flex h-10 items-center border-b-2 px-3 text-sm leading-5",
            active
              ? "border-foreground font-medium text-foreground"
              : "border-transparent text-muted-foreground",
            tab.disabled ? "cursor-default opacity-60" : "hover:text-foreground",
          );
          if (tab.disabled) {
            return (
              <span key={tab.label} aria-disabled className={className} title="Ships in batch 2">
                {body}
              </span>
            );
          }
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
