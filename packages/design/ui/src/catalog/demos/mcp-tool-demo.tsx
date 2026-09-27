"use client";

import { McpTool } from "@nebutra/ui/primitives";

export function McpToolDemo() {
  return (
    <div className="w-full max-w-xl p-6">
      <McpTool
        state="completed"
        name="linear.create_issue"
        args={{ team: "Platform", title: "Retry webhook deliveries on 5xx", priority: 2 }}
        output={`Created PLAT-482 "Retry webhook deliveries on 5xx" (priority: High)`}
        defaultOpen
      />
    </div>
  );
}
