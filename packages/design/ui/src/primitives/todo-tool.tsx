"use client";

import { ArrowRight, Check } from "@nebutra/icons";
import { memo, type ReactElement } from "react";
import { cn } from "../utils/cn";
import { TextShimmer } from "./text-shimmer";

/* -------------------------------------------------------------------------- *\
 *  TodoTool — inline AI tool-call rendering for the TodoWrite tool family.
 *
 *  Sibling of EditTool / QuestionTool / McpTool. Flat, append-only, read-only
 *  task list as rendered inline inside a chat reply when the model invokes
 *  the TodoWrite tool (Cursor / Claude Code "Todos updated" surfaces).
 *
 *  Relationship to AgentPlan (do not confuse):
 *    - AgentPlan        → dashboard-level hierarchical planner with subtasks,
 *                         dependencies, motion animations, 5-state status enum
 *                         (`"in-progress"` hyphenated). Heavy (~18KB), uses
 *                         motion/react. Suited for /agents, /plans surfaces.
 *    - TodoTool (here)  → inline chat-level flat status list. 3-state enum
 *                         (`"in_progress"` underscored, matching the actual
 *                         Claude TodoWrite tool wire format). Read-only,
 *                         no animations beyond the streaming shimmer header.
 *
 *  Status enum is deliberately distinct from AgentPlan's — TodoTool's strings
 *  pass through verbatim from the TodoWrite tool output; downstream chat
 *  orchestrators should NOT need to translate.
 *
 *  States:
 *    - state="loading"  → shimmer header only ("Creating to-do list..."
 *                         or "Updating to-dos..." per `mode`). No list.
 *    - state="ready"    → renders todos. Empty array renders nothing
 *                         (caller decides whether to show an empty state).
 *
 *  Modifiers:
 *    - dimmed=true      → all items render muted (the AI is mid-revision and
 *                         the current snapshot should not look authoritative).
 *
 *  a11y:
 *    - <ol aria-label="To-dos"> wraps the list
 *    - Each <li> has aria-current="step" when in_progress (assistive
 *      technologies can announce "current step" appropriately)
 *    - completed items use <s> for both visual line-through and SR semantic
 *    - icons render aria-hidden (decorative; status is in text + aria-current)
\* -------------------------------------------------------------------------- */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Status enum matching the Claude TodoWrite tool wire format.
 * NOTE: distinct from AgentPlan's `TaskStatus` (hyphenated, 5 states).
 */
export type TodoStatus = "pending" | "in_progress" | "completed";

export type TodoItem = {
  /** Optional stable id. Fallback to index + content slice for keying. */
  id?: string;
  content: string;
  status: TodoStatus;
};

export type TodoToolState = "loading" | "ready";
export type TodoToolMode = "creating" | "updating";

export type TodoToolProps = {
  /** @default "ready" */
  state?: TodoToolState;
  /** Used only when state="loading" to pick the shimmer label. @default "updating" */
  mode?: TodoToolMode;
  /** Task list. Empty array in `ready` state renders nothing. */
  todos?: readonly TodoItem[];
  /** When true, all items render in the muted "soft" treatment. @default false */
  dimmed?: boolean;
  className?: string;
};

// ---------------------------------------------------------------------------
// Status indicator (internal)
// ---------------------------------------------------------------------------

function TodoStatusIcon({ status, dimmed }: { status: TodoStatus; dimmed: boolean }): ReactElement {
  const containerCls = "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border";

  if (status === "completed") {
    return (
      <span className={cn(containerCls, "border-border")}>
        <Check className="h-2 w-2 text-muted-foreground" aria-hidden="true" />
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className={cn(containerCls, dimmed ? "border-border" : "border-muted-foreground/60")}>
        <ArrowRight className="h-2 w-2 text-muted-foreground" aria-hidden="true" />
      </span>
    );
  }
  // pending — empty bordered circle
  return <span className={cn(containerCls, "border-muted-foreground/60")} />;
}

// ---------------------------------------------------------------------------
// List item (internal)
// ---------------------------------------------------------------------------

const TodoListItem = memo(function TodoListItem({
  todo,
  dimmed,
}: {
  todo: TodoItem;
  dimmed: boolean;
}): ReactElement {
  const isCompleted = todo.status === "completed";
  const isInProgress = todo.status === "in_progress";
  // Active = the one item that should look "lit up". Everything else is muted.
  const isActive = !dimmed && isInProgress;

  const textCls = cn("text-sm", isActive ? "text-foreground" : "text-muted-foreground");

  return (
    <li aria-current={isInProgress ? "step" : undefined} className="flex items-start gap-2">
      <span className="mt-[2px]">
        <TodoStatusIcon status={todo.status} dimmed={dimmed} />
      </span>
      {isCompleted ? (
        <s className={textCls}>{todo.content}</s>
      ) : (
        <span className={textCls}>{todo.content}</span>
      )}
    </li>
  );
});

// ---------------------------------------------------------------------------
// TodoTool
// ---------------------------------------------------------------------------

const LOADING_LABEL: Readonly<Record<TodoToolMode, string>> = {
  creating: "Creating to-do list...",
  updating: "Updating to-dos...",
};

export const TodoTool = memo(function TodoTool({
  state = "ready",
  mode = "updating",
  todos = [],
  dimmed = false,
  className,
}: TodoToolProps): ReactElement | null {
  if (state === "loading") {
    return (
      <div className={cn("text-sm leading-relaxed", className)}>
        <TextShimmer as="span" className="text-sm">
          {LOADING_LABEL[mode]}
        </TextShimmer>
      </div>
    );
  }

  if (todos.length === 0) return null;

  return (
    <ol
      aria-label="To-dos"
      className={cn("flex flex-col gap-2 text-sm leading-relaxed", className)}
    >
      {todos.map((todo, idx) => {
        const key = todo.id ?? `${idx}-${todo.content.slice(0, 16)}`;
        return <TodoListItem key={key} todo={todo} dimmed={dimmed} />;
      })}
    </ol>
  );
});
