"use client";

import { McpTool } from "@nebutra/ui/primitives";

const resourcesJson = JSON.stringify(
  [
    { id: "res_1", name: "Billing" },
    { id: "res_2", name: "Support" },
    { id: "res_3", name: "Onboarding" },
  ],
  null,
  2,
);

export function McpToolDemo() {
  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <McpTool
        name="List Resources"
        args={{ query: "active customers", limit: 25 }}
        output={resourcesJson}
        defaultOpen
      />
      <McpTool state="pending" name="Search Documentation" />
      <McpTool state="interrupted" name="Generate Report" />
    </div>
  );
}
