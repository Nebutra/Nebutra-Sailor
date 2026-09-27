"use client";

import { TodoTool } from "@nebutra/ui/primitives";

export function TodoToolDemo() {
  return (
    <div className="w-full max-w-xl p-6">
      <TodoTool
        state="ready"
        mode="updating"
        todos={[
          { content: "Add a retry column to webhook_deliveries", status: "completed" },
          { content: "Back off on 5xx with jitter", status: "in_progress" },
          { content: "Alert after the fifth failed attempt", status: "pending" },
        ]}
      />
    </div>
  );
}
