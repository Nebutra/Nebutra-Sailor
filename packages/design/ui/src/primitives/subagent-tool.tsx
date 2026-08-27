"use client";

import { memo, type ReactElement } from "react";
import { cn } from "../utils/cn";
import { TextShimmer } from "./text-shimmer";

/* -------------------------------------------------------------------------- *\
 *  SubagentTool — inline status pill for delegated subagent invocations.
 *
 *  Sibling of EditTool / QuestionTool / McpTool / TodoTool / SearchTool.
 *  See `project_tool_family_primitives` memory for the boundary contract.
 *
 *  Shape: the lightest member of the tool-family — a single status line,
 *  no body, no expand. Renders as a status pill inside a chat reply when
 *  the assistant delegates work to a subagent (Claude Code subagents,
 *  agent-as-tool patterns, etc.).
 *
 *  States:
 *    - pending     → shimmer "Running Subagent" + optional description + elapsed
 *    - completed   → static "Completed Subagent" + optional description + elapsed
 *    - interrupted → muted "Subagent interrupted" — description + elapsed suppressed
 *
 *  `elapsedTime` is an already-formatted display string ("6s", "1m 24s", etc).
 *  Owned by upstream — primitives do not run timers. Letting each primitive
 *  self-tick produces drift between adjacent rows in a chat thread.
 *
 *  a11y:
 *    - <output aria-live="polite"> wraps the line so the transition
 *      pending → completed / interrupted is announced to SRs.
 *      ("status" role is implicit on <output> — do not add it.)
 *    - elapsed time carries an sr-only "Elapsed time:" prefix so SR users
 *      hear "Elapsed time: 6s" instead of the ambiguous bare "6s".
\* -------------------------------------------------------------------------- */

export type SubagentToolState = "completed" | "pending" | "interrupted";

export type SubagentToolProps = {
  /** @default "completed" */
  state?: SubagentToolState;
  /**
   * Detail text — typically the currently-running nested tool name while
   * pending, or the subagent's task description once completed.
   */
  description?: string;
  /**
   * Trailing elapsed-time label, already formatted (e.g. "6s", "1m 24s").
   * Suppressed in interrupted state.
   */
  elapsedTime?: string;
  className?: string;
};

const LABEL: Readonly<Record<SubagentToolState, string>> = {
  pending: "Running Subagent",
  completed: "Completed Subagent",
  interrupted: "Subagent interrupted",
};

export const SubagentTool = memo(function SubagentTool({
  state = "completed",
  description,
  elapsedTime,
  className,
}: SubagentToolProps): ReactElement {
  const isPending = state === "pending";
  const isInterrupted = state === "interrupted";
  const label = LABEL[state];
  const showDetails = !isInterrupted;

  return (
    <output
      aria-live="polite"
      className={cn(
        "flex max-w-full select-none items-center gap-2 text-sm text-muted-foreground",
        className,
      )}
    >
      <span className="shrink-0 whitespace-nowrap font-medium">
        {isPending ? (
          <TextShimmer as="span" className="text-sm">
            {label}
          </TextShimmer>
        ) : (
          label
        )}
      </span>
      {showDetails && description && (
        <span className="min-w-0 flex-1 truncate font-normal text-muted-foreground/70">
          {description}
        </span>
      )}
      {showDetails && elapsedTime && (
        <span className="shrink-0 font-normal tabular-nums text-muted-foreground/70">
          <span className="sr-only">Elapsed time: </span>
          {elapsedTime}
        </span>
      )}
    </output>
  );
});
