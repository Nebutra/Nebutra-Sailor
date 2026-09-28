"use client";

import { SubagentTool } from "@nebutra/ui/primitives";

export function SubagentToolDemo() {
  return (
    <div className="flex w-full max-w-xl flex-col gap-3 p-6">
      <SubagentTool
        state="pending"
        description="Auditing billing webhooks for retries"
        elapsedTime="12s"
      />
      <SubagentTool
        state="completed"
        description="Summarised last week's failed deploys"
        elapsedTime="41s"
      />
    </div>
  );
}
