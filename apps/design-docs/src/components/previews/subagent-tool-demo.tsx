"use client";

import { SubagentTool } from "@nebutra/ui/primitives";

export function SubagentToolDemo() {
  return (
    <div className="flex w-full max-w-[420px] flex-col gap-3">
      <SubagentTool state="pending" description="Reading" elapsedTime="2s" />
      <SubagentTool state="completed" description="Audit complete" elapsedTime="14s" />
      <SubagentTool state="interrupted" />
    </div>
  );
}
