"use client";

import { ChevronRight } from "@nebutra/icons";
import { memo, type ReactElement, useCallback, useId, useMemo, useState } from "react";
import { cn } from "../utils/cn";
import { TextShimmer } from "./text-shimmer";

/* -------------------------------------------------------------------------- *\
 *  McpTool — inline AI tool-call rendering for MCP tool invocations.
 *
 *  Aesthetic family: sibling of EditTool / QuestionTool. Cursor / Claude Code /
 *  Vercel ai-elements inline tool blocks. Composes TextShimmer; uses
 *  @nebutra/icons ChevronRight for the expand affordance.
 *
 *  Three states:
 *    pending     → header shimmer "Preparing X"; no args, no output panel
 *    completed   → past-tense header ("Listed Resources") + optional expandable output
 *    interrupted → single muted line "X interrupted" (role=status for SR)
 *
 *  Tool name normalization:
 *    Accepts "list_resources" (snake_case), "listResources" (camelCase), or
 *    "List Resources" (Title Case). All three normalize to "List Resources"
 *    for display and verb conjugation.
 *
 *  Verb conjugation: see COMPLETED_VERBS. Unknown verbs fall through verbatim.
 *
 *  Arg formatting: priority-sorted (query/email/id/... first), max N args shown
 *  (default 2), each value truncated to maxArgValueChars (default 30).
 *
 *  Output formatting: JSON detected by leading {/[ and pretty-printed; falls
 *  back to raw text. Truncated at maxOutputChars with an honest suffix that
 *  reports the original byte length.
 *
 *  a11y:
 *    - <section> wrapper with aria-label for the whole tool
 *    - Toggle button: aria-expanded + aria-controls → output region id
 *    - Output is a nested <section aria-label="Tool output"> wrapping <pre>
 *    - Interrupted state: role="status" so SR announces termination
 *    - ChevronRight rendered aria-hidden (decorative)
\* -------------------------------------------------------------------------- */

// ---------------------------------------------------------------------------
// Constants — overridable via props where it matters
// ---------------------------------------------------------------------------

export const MCP_DEFAULT_MAX_ARGS_SHOWN = 2;
export const MCP_DEFAULT_MAX_ARG_VALUE_CHARS = 30;
export const MCP_DEFAULT_MAX_OUTPUT_CHARS = 3000;

/** Past-tense conjugation for common MCP verbs. */
const COMPLETED_VERBS: Readonly<Record<string, string>> = {
  Add: "Added",
  Check: "Checked",
  Create: "Created",
  Delete: "Deleted",
  Draft: "Drafted",
  Fetch: "Fetched",
  Find: "Found",
  Generate: "Generated",
  Get: "Got",
  List: "Listed",
  Manage: "Managed",
  Modify: "Modified",
  Query: "Queried",
  Remove: "Removed",
  Retrieve: "Retrieved",
  Search: "Searched",
  Send: "Sent",
  Set: "Set",
  Start: "Started",
  Update: "Updated",
};

/** Arg keys to show first when more args exist than the display cap. */
const PRIORITY_ARG_KEYS: readonly string[] = [
  "query",
  "question",
  "email",
  "name",
  "id",
  "customer",
  "url",
  "issue",
  "body",
  "summary",
  "title",
];

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Normalize raw MCP tool name into Title Case words.
 *
 *   "list_resources"  → "List Resources"
 *   "listResources"   → "List Resources"
 *   "List Resources"  → "List Resources"
 *   "list-resources"  → "List Resources"
 */
function humanizeToolName(raw: string): string {
  const withSpaces = raw
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  return withSpaces
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getCompletedTitle(humanized: string): string {
  const spaceAt = humanized.indexOf(" ");
  const verb = spaceAt === -1 ? humanized : humanized.slice(0, spaceAt);
  const rest = spaceAt === -1 ? "" : humanized.slice(spaceAt + 1);
  const past = COMPLETED_VERBS[verb];
  if (!past) return humanized;
  return rest ? `${past} ${rest}` : past;
}

export type McpToolArgValue = string | number | boolean | null | undefined;
export type McpToolArgs = Record<string, McpToolArgValue>;

function formatArgs(
  input: McpToolArgs | undefined,
  maxShown: number,
  maxValueChars: number,
): string {
  if (!input) return "";
  const entries = Object.entries(input).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (entries.length === 0) return "";

  const sorted = [...entries].sort(([a], [b]) => {
    const ai = PRIORITY_ARG_KEYS.indexOf(a);
    const bi = PRIORITY_ARG_KEYS.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return 0;
  });

  const parts: string[] = [];
  for (const [key, value] of sorted) {
    if (parts.length >= maxShown) break;
    const raw = typeof value === "string" ? value : String(value);
    const display = raw.length > maxValueChars ? `${raw.slice(0, maxValueChars - 3)}...` : raw;
    parts.push(`${key}: ${display}`);
  }
  return parts.join("  ");
}

function formatOutput(output: string, maxChars: number): string {
  const trimmed = output.trim();
  if (!trimmed) return "";
  const looksJson = trimmed.startsWith("{") || trimmed.startsWith("[");

  let body = output;
  if (looksJson) {
    try {
      body = JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      // fall through with raw output
    }
  }

  if (body.length <= maxChars) return body;
  const originalLen = body.length.toLocaleString();
  return `${body.slice(0, maxChars)}\n… (truncated — original ${originalLen} chars)`;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type McpToolState = "completed" | "pending" | "interrupted";

export type McpToolProps = {
  /**
   * - `pending`     → shimmer "Preparing X"
   * - `completed`   → past-tense header + optional expandable output (default)
   * - `interrupted` → "X interrupted" muted line, no body
   * @default "completed"
   */
  state?: McpToolState;

  /**
   * Raw MCP tool name. snake_case / camelCase / Title Case all accepted —
   * normalized internally. Pass exactly what your MCP server reports.
   */
  name: string;

  /** Tool arguments. Sorted by priority, capped at `maxArgsShown`. */
  args?: McpToolArgs;

  /** Tool output. JSON auto-pretty-printed; plain text rendered as-is. */
  output?: string;

  /** Initial expand state (uncontrolled). @default false */
  defaultOpen?: boolean;

  /** Controlled expand state. Pair with `onExpandedChange`. */
  expanded?: boolean;
  onExpandedChange?: (next: boolean) => void;

  /** @default 2 */
  maxArgsShown?: number;
  /** @default 30 */
  maxArgValueChars?: number;
  /** @default 3000 */
  maxOutputChars?: number;

  className?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const McpTool = memo(function McpTool({
  state = "completed",
  name,
  args,
  output,
  defaultOpen = false,
  expanded,
  onExpandedChange,
  maxArgsShown = MCP_DEFAULT_MAX_ARGS_SHOWN,
  maxArgValueChars = MCP_DEFAULT_MAX_ARG_VALUE_CHARS,
  maxOutputChars = MCP_DEFAULT_MAX_OUTPUT_CHARS,
  className,
}: McpToolProps): ReactElement {
  const outputId = useId();
  const humanized = useMemo(() => humanizeToolName(name), [name]);

  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen: boolean = expanded !== undefined ? expanded : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (expanded === undefined) setInternalOpen(next);
      onExpandedChange?.(next);
    },
    [expanded, onExpandedChange],
  );

  const isPending = state === "pending";
  const isInterrupted = state === "interrupted";

  const formattedOutput = useMemo(
    () => (isPending || isInterrupted || !output ? "" : formatOutput(output, maxOutputChars)),
    [isPending, isInterrupted, output, maxOutputChars],
  );

  const expandable = !isPending && !isInterrupted && formattedOutput.length > 0;

  const handleToggle = useCallback(() => {
    if (!expandable) return;
    setOpen(!isOpen);
  }, [expandable, isOpen, setOpen]);

  // --- Interrupted: degenerate render path (after all hooks) ---------------
  if (isInterrupted) {
    return (
      <div
        role="status"
        className={cn(
          "flex select-none items-center gap-1 text-sm text-muted-foreground",
          className,
        )}
      >
        <span className="font-medium">{humanized} interrupted</span>
      </div>
    );
  }

  // --- Pending / completed -------------------------------------------------
  const title = isPending ? `Preparing ${humanized}` : getCompletedTitle(humanized);
  const subtitle = isPending ? "" : formatArgs(args, maxArgsShown, maxArgValueChars);

  return (
    <section
      aria-label={subtitle ? `${title} — ${subtitle}` : title}
      className={cn("flex w-full flex-col gap-2", className)}
    >
      <button
        type="button"
        onClick={handleToggle}
        disabled={!expandable}
        aria-expanded={expandable ? isOpen : undefined}
        aria-controls={expandable ? outputId : undefined}
        className={cn(
          "group m-0 flex max-w-full select-none items-center gap-1 border-0 bg-transparent p-0 text-left",
          expandable ? "cursor-pointer" : "cursor-default",
        )}
      >
        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <span className="shrink-0 whitespace-nowrap font-medium">
            {isPending ? (
              <TextShimmer as="span" className="text-sm">
                {title}
              </TextShimmer>
            ) : (
              title
            )}
          </span>
          {subtitle && (
            <span className="min-w-0 flex-1 truncate font-normal text-muted-foreground/70">
              {subtitle}
            </span>
          )}
        </div>
        {expandable && (
          <ChevronRight
            aria-hidden="true"
            className={cn(
              "size-3 shrink-0 text-muted-foreground transition-transform duration-150 ease-out",
              isOpen ? "rotate-90" : "rotate-0",
            )}
          />
        )}
      </button>

      {expandable && isOpen && (
        <section
          aria-label="Tool output"
          className="overflow-hidden rounded-lg border border-border bg-card"
        >
          <pre
            id={outputId}
            className="m-0 overflow-x-auto whitespace-pre p-3 font-mono text-[12px] leading-[1.5] text-foreground"
          >
            {formattedOutput}
          </pre>
        </section>
      )}
    </section>
  );
});
