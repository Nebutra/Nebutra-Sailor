"use client";

import { MagnifyingGlass } from "@nebutra/icons";
import { Dialog, DialogContent, DialogTitle } from "@nebutra/ui/primitives";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ConsoleTab } from "./console-tabs";

/**
 * ⌘K. Batch 1 jumps between the tabs; finding a tenant and running an action
 * from here arrive with the MCP surface (model.md step 6).
 */
export function CommandPalette({ tabs }: { tabs: ConsoleTab[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const targets = tabs.filter((t) => !t.disabled);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const jump = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-[260px] items-center gap-2 rounded-md border border-border bg-background px-2.5 text-muted-foreground text-sm hover:border-muted-foreground/40"
      >
        <MagnifyingGlass className="size-3.5 shrink-0" aria-hidden />
        <span className="flex-1 text-left">Jump to…</span>
        <kbd className="rounded border border-border px-1.5 font-mono text-[11px] leading-4">
          ⌘K
        </kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogTitle className="border-border border-b px-4 py-3 font-medium text-sm">
            Jump to
          </DialogTitle>
          <ul className="p-1.5">
            {targets.map((tab) => (
              <li key={tab.href}>
                <button
                  type="button"
                  onClick={() => jump(tab.href)}
                  className="flex h-9 w-full items-center justify-between rounded-md px-2.5 text-left text-sm hover:bg-muted"
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined ? (
                    <span className="text-muted-foreground text-xs">{tab.count}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
