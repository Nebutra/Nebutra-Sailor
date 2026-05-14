"use client";

import { type TodoItem, TodoTool } from "@nebutra/ui/primitives";

const todos: TodoItem[] = [
  { content: "Audit components", status: "completed" },
  { content: "Tighten spacing", status: "in_progress" },
  { content: "Ship updates", status: "pending" },
];

export function TodoToolDemo() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <TodoTool todos={todos} />
      <div className="border-t border-border pt-4">
        <TodoTool state="loading" mode="creating" />
      </div>
    </div>
  );
}
