"use client";

import { SettingsGear } from "@nebutra/icons";
import { useUiStore } from "@/stores/ui-store";

/** One thin line. Assets · Ask PARA · settings. It never grows on its own. */
export function BottomDock() {
  const activeDrawer = useUiStore((s) => s.activeDrawer);
  const toggleDrawer = useUiStore((s) => s.toggleDrawer);
  const setDrawer = useUiStore((s) => s.setDrawer);
  const setAgent = useUiStore((s) => s.setAgent);
  const agentStatus = useUiStore((s) => s.agent.status);

  // While the agent panel is open the dock is replaced by the composer.
  if (activeDrawer === "agent" || agentStatus === "running") return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
      <div className="para-rise pointer-events-auto flex h-[var(--para-dock-h)] w-[min(640px,80%)] items-center gap-1 rounded-full border border-border bg-popover pr-1.5 pl-1.5 shadow-ambient-md">
        <button
          type="button"
          onClick={() => toggleDrawer("library")}
          aria-pressed={activeDrawer === "library"}
          className="h-[var(--para-h-control)] rounded-full px-3.5 text-sm text-foreground hover:bg-accent aria-pressed:bg-accent"
        >
          Assets
        </button>
        <button
          type="button"
          onClick={() => {
            setDrawer("agent");
            setAgent({ status: "composing" });
          }}
          className="flex h-[var(--para-h-control)] flex-1 items-center rounded-full px-4 text-left text-muted-foreground text-sm hover:bg-accent hover:text-foreground"
        >
          Ask PARA…
        </button>
        <button
          type="button"
          aria-label="Workspace settings"
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <SettingsGear className="size-4" />
        </button>
      </div>
    </div>
  );
}
