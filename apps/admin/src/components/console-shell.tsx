import { brand } from "@nebutra/brand/metadata";
import type { ReactNode } from "react";
import type { StaffContext } from "@/lib/staff";
import { CommandPalette } from "./command-palette";
import { type ConsoleTab, ConsoleTabs } from "./console-tabs";

/**
 * One shell for every route: 48 px top bar, 40 px tab row, 1400 px column.
 * No Settings tab — configuration lives inside the domain that needs it.
 */
export function ConsoleShell({
  staff,
  environment,
  tabs,
  children,
}: {
  staff: StaffContext;
  environment: string;
  tabs: ConsoleTab[];
  children: ReactNode;
}) {
  const initial = (staff.email[0] ?? "?").toUpperCase();
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex h-12 items-center gap-3 border-border border-b bg-card px-4 sm:px-6">
        <span className="flex size-5 items-center justify-center rounded-sm bg-foreground font-semibold text-xs text-background">
          {brand.name[0]}
        </span>
        <span className="font-medium text-sm">{brand.name}</span>
        <span className="text-border text-sm">/</span>
        <span className="text-sm">Admin</span>
        <span className="rounded-full border border-border px-1.5 text-xs text-muted-foreground leading-4">
          {environment}
        </span>
        <div className="flex-1" />
        <CommandPalette tabs={tabs} />
        <span className="hidden text-muted-foreground text-xs md:inline">
          {staff.email} · {staff.role}
        </span>
        <span
          role="img"
          aria-label={`${staff.email} · ${staff.role}`}
          className="ml-1 flex size-8 items-center justify-center rounded-full bg-foreground font-medium text-background text-xs"
        >
          {initial}
        </span>
      </header>
      <ConsoleTabs tabs={tabs} />
      <main className="mx-auto flex w-full min-w-0 max-w-wide flex-1 flex-col gap-5 px-4 py-6 sm:px-6 sm:py-7">
        {children}
      </main>
    </div>
  );
}
