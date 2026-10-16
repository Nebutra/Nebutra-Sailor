"use client";

import {
  SidebarSearchButton,
  SidebarUsageMeter,
  SidebarWorkspacePlate,
} from "@nebutra/ui/patterns";

export function SidebarChromeDemo() {
  return (
    <div className="flex w-60 flex-col gap-3 bg-sidebar p-3">
      <SidebarWorkspacePlate name="Acme Robotics" plan="Pro" />
      <SidebarSearchButton label="Search or jump to…" />
      <SidebarUsageMeter
        plan="Free plan"
        label="Credits left"
        measure="remaining"
        used={1240}
        limit={1500}
        valueLabel="1,240 / 1,500"
      />
    </div>
  );
}
