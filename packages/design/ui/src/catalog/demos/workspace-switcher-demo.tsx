"use client";

import { WorkspaceSwitcher } from "@nebutra/ui/patterns";
import { useState } from "react";

const WORKSPACES = [
  { id: "acme", name: "Acme Inc", role: "owner" as const, plan: "Team" },
  { id: "acme-labs", name: "Acme Labs", role: "admin" as const, plan: "Pro" },
  { id: "side", name: "Dana's projects", role: "owner" as const, plan: "Hobby" },
];

export function WorkspaceSwitcherDemo() {
  const [active, setActive] = useState("acme");
  return (
    <div className="flex justify-center p-10">
      <WorkspaceSwitcher
        workspaces={WORKSPACES}
        activeWorkspaceId={active}
        onSwitch={setActive}
        showRoleBadge
      />
    </div>
  );
}
