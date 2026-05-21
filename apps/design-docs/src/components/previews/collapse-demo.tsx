"use client";

import { Collapse, CollapseGroup } from "@nebutra/ui/primitives";

export function CollapseDemo() {
  return (
    <div className="w-full max-w-md">
      <CollapseGroup>
        <Collapse title="Request payload" defaultExpanded>
          <pre className="overflow-x-auto rounded-[var(--radius-md)] bg-muted p-3 text-xs">
            {JSON.stringify({ region: "iad1", plan: "pro" }, null, 2)}
          </pre>
        </Collapse>
        <Collapse title="Response headers">
          <p className="text-sm text-muted-foreground">
            Cache status, request id, and retry budget metadata.
          </p>
        </Collapse>
      </CollapseGroup>
    </div>
  );
}
