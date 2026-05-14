"use client";

import { memo, type ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "../utils/cn";
import { LoadingDots } from "./loading-dots";
import { TextShimmer } from "./text-shimmer";

/* -------------------------------------------------------------------------- *\
 *  EditTool — inline AI tool-call rendering for file edits.
 *
 *  Aesthetic family: Cursor / Claude Code / Vercel ai-elements inline diff blocks.
 *  Composed from the existing TextShimmer + LoadingDots primitives, so the
 *  visual language matches QuestionTool and the rest of the chat tool family.
 *
 *  Three states:
 *    waiting    → header shimmer "Generating..."; no body, no diff
 *    pending    → header shimmer "Editing X.tsx"; diff rendered; approval pending
 *    completed  → header static "Edited X.tsx"; diff rendered; approval resolved
 *
 *  Two variants:
 *    edit   → LCS diff of oldContent vs newContent
 *    write  → every line is an add (no oldContent needed)
 *
 *  Safety: LCS is O(m·n) — capped at `maxDiffLines` (default 2000) lines
 *  on either side. Larger inputs fall back to a placeholder.
 *
 *  a11y:
 *    - <section aria-label> outer landmark — covers header + diff body
 *    - <output aria-live="polite"> announces approval state changes
 *    - LoadingDots renders aria-hidden via its primitive contract
 *    - Composite key per line — stable across diff recomputes
 *
 *  Design invariants (do not break without an ADR):
 *    1. Diff gutter MUST be the literal characters "+" / "-" / " ", never
 *       icons. Reason: gutter is a single monospace column rendered inside
 *       a `font-mono` block; swapping to <Plus />/<Minus /> SVG breaks
 *       baseline alignment, column width, and copy-paste fidelity. The
 *       lucide/Geist icon-governance rule does NOT apply here — there is
 *       no icon to begin with.
 *    2. LCS hard cap (`maxDiffLines`) MUST stay ≤ 2000 with the current
 *       O(m·n) implementation. Memory at 2000² ≈ ~32MB int allocation;
 *       lifting the cap requires swapping in Myers or patience diff
 *       (O(ND)) FIRST. Do not raise the default without that swap.
\* -------------------------------------------------------------------------- */

// ---------------------------------------------------------------------------
// LCS diff
// ---------------------------------------------------------------------------

type DiffOp = { type: "context" | "remove" | "add"; text: string };

function lineDiff(oldText: string, newText: string): DiffOp[] {
  const a = oldText.split("\n");
  const b = newText.split("\n");
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      const ai = a[i];
      const bj = b[j];
      const cur = dp[i] ?? [];
      const next = dp[i + 1] ?? [];
      const right = cur[j + 1] ?? 0;
      const down = next[j] ?? 0;
      cur[j] = ai === bj ? (next[j + 1] ?? 0) + 1 : Math.max(down, right);
      dp[i] = cur;
    }
  }
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    const ai = a[i] ?? "";
    const bj = b[j] ?? "";
    if (ai === bj) {
      ops.push({ type: "context", text: ai });
      i++;
      j++;
    } else if ((dp[i + 1]?.[j] ?? 0) >= (dp[i]?.[j + 1] ?? 0)) {
      ops.push({ type: "remove", text: ai });
      i++;
    } else {
      ops.push({ type: "add", text: bj });
      j++;
    }
  }
  while (i < m) {
    ops.push({ type: "remove", text: a[i] ?? "" });
    i++;
  }
  while (j < n) {
    ops.push({ type: "add", text: b[j] ?? "" });
    j++;
  }
  return ops;
}

function countDiffStats(ops: DiffOp[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const op of ops) {
    if (op.type === "add") added++;
    else if (op.type === "remove") removed++;
  }
  return { added, removed };
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type EditToolState = "completed" | "pending" | "waiting";
export type EditToolVariant = "edit" | "write";
export type ApprovalDecision = "approved" | "rejected" | null;

export type EditToolApproval = {
  approveLabel?: string;
  rejectLabel?: string;
  /** Uncontrolled initial decision. */
  defaultDecision?: ApprovalDecision;
  /** Controlled decision. When provided, parent owns the value. */
  decision?: ApprovalDecision;
  /** Called on every decision change (including controlled mode). */
  onDecisionChange?: (decision: ApprovalDecision) => void;
  onApprove?: () => void;
  onReject?: () => void;
};

export type EditToolProps = {
  /**
   * - `completed` → past-tense label + full diff
   * - `pending`   → shimmer header + diff rendered
   * - `waiting`   → shimmer header only (no body)
   * @default "completed"
   */
  state?: EditToolState;
  /**
   * - `edit`  → LCS diff of oldContent vs newContent
   * - `write` → newContent only, all lines as adds
   * @default "edit"
   */
  variant?: EditToolVariant;
  /** Path shown by basename in the header. Omit to render no filename. */
  filePath?: string;
  /** Required for `variant: "edit"`. Ignored for `variant: "write"`. */
  oldContent?: string;
  /** Required for both variants when a diff body should render. */
  newContent?: string;
  /** Optional approval footer. */
  approval?: EditToolApproval;
  /** LCS hard cap to prevent O(m·n) OOM on huge files. @default 2000 */
  maxDiffLines?: number;
  className?: string;
};

// ---------------------------------------------------------------------------
// Approval footer (internal)
// ---------------------------------------------------------------------------

type ApprovalFooterProps = {
  isPending: boolean;
  approval: EditToolApproval;
};

function ApprovalFooter({ isPending, approval }: ApprovalFooterProps): ReactElement {
  const {
    approveLabel = "Approve",
    rejectLabel = "Reject",
    decision: controlledDecision,
    defaultDecision = null,
    onDecisionChange,
    onApprove,
    onReject,
  } = approval;

  const [uncontrolled, setUncontrolled] = useState<ApprovalDecision>(defaultDecision);
  const isControlled = controlledDecision !== undefined;
  const decision = isControlled ? controlledDecision : uncontrolled;

  const update = useCallback(
    (next: ApprovalDecision) => {
      if (!isControlled) setUncontrolled(next);
      onDecisionChange?.(next);
    },
    [isControlled, onDecisionChange],
  );

  const handleApprove = useCallback(() => {
    update("approved");
    onApprove?.();
  }, [update, onApprove]);

  const handleReject = useCallback(() => {
    update("rejected");
    onReject?.();
  }, [update, onReject]);

  let status: string | null = null;
  if (decision === "approved") status = isPending ? "Starting" : "Approved";
  else if (decision === "rejected") status = "Canceled";
  else if (isPending) status = "Waiting";

  return (
    <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/40 px-2.5 py-2">
      <output
        aria-live="polite"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        {status ?? ""}
        {decision === "approved" && isPending && <LoadingDots size={3} aria-hidden="true" />}
      </output>
      {decision === null && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleReject}
            className="h-7 rounded-sm border border-border bg-transparent px-2 text-xs font-medium text-foreground transition-colors duration-micro hover:bg-accent"
          >
            {rejectLabel}
          </button>
          <button
            type="button"
            onClick={handleApprove}
            className="h-7 rounded-sm bg-primary px-2 text-xs font-medium text-primary-foreground transition-colors duration-micro hover:bg-primary/90"
          >
            {approveLabel}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EditTool
// ---------------------------------------------------------------------------

export const EditTool = memo(function EditTool({
  state = "completed",
  variant = "edit",
  filePath,
  oldContent,
  newContent,
  approval,
  maxDiffLines = 2000,
  className,
}: EditToolProps): ReactElement {
  const isPending = state === "pending";
  const isWaiting = state === "waiting";
  const isWrite = variant === "write";
  const fileName = filePath?.split("/").pop();

  // Cap-aware diff computation.
  const diffOps = useMemo<DiffOp[] | null>(() => {
    if (isWaiting) return null;

    if (isWrite && newContent !== undefined) {
      const lines = newContent.split("\n");
      if (lines.length > maxDiffLines) return null;
      return lines.map((text) => ({ type: "add" as const, text }));
    }

    if (oldContent !== undefined && newContent !== undefined) {
      const aLines = oldContent.split("\n").length;
      const bLines = newContent.split("\n").length;
      if (aLines > maxDiffLines || bLines > maxDiffLines) return null;
      return lineDiff(oldContent, newContent);
    }

    return null;
  }, [isWaiting, isWrite, oldContent, newContent, maxDiffLines]);

  const exceededCap = useMemo(() => {
    if (isWaiting) return false;
    if (diffOps !== null) return false;
    if (oldContent === undefined && newContent === undefined) return false;
    return true;
  }, [isWaiting, diffOps, oldContent, newContent]);

  const stats = useMemo(() => (diffOps ? countDiffStats(diffOps) : null), [diffOps]);

  // Lazy keyboard hook — Esc dismisses pending approval if controlled by parent.
  useEffect(() => {
    if (!isPending || !approval) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") approval.onReject?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPending, approval]);

  const headerLabel = isWaiting
    ? "Generating..."
    : isPending
      ? `${isWrite ? "Creating" : "Editing"}${fileName ? ` ${fileName}` : ""}`
      : `${isWrite ? "Created" : "Edited"}${fileName ? ` ${fileName}` : ""}`;

  const hasBody = (diffOps && diffOps.length > 0) || exceededCap;

  return (
    <section
      aria-label={fileName ? `${headerLabel} (${fileName})` : headerLabel}
      className={cn("w-full overflow-hidden rounded-lg border border-border bg-card", className)}
    >
      <header
        className={cn(
          "flex h-7 items-center justify-between bg-muted px-2.5",
          hasBody || approval ? "border-b border-border" : "",
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {isPending || isWaiting ? (
            <TextShimmer as="span" className="text-xs">
              {headerLabel}
            </TextShimmer>
          ) : (
            <span className="truncate text-xs text-muted-foreground">{headerLabel}</span>
          )}
        </div>
        {stats && !isPending && !isWaiting && (stats.added > 0 || stats.removed > 0) && (
          <span className="inline-flex shrink-0 gap-2 font-mono text-[11px] text-muted-foreground">
            {stats.added > 0 && <span className="text-success">+{stats.added}</span>}
            {stats.removed > 0 && <span className="text-destructive">-{stats.removed}</span>}
          </span>
        )}
      </header>

      {exceededCap && (
        <div className="bg-background px-3 py-3 text-xs text-muted-foreground">
          Diff exceeds {maxDiffLines.toLocaleString()} lines — open the file to view changes.
        </div>
      )}

      {diffOps && diffOps.length > 0 && (
        <div className="overflow-x-auto bg-background font-mono text-[12px] leading-[1.5]">
          {diffOps.map((op, i) => {
            const stableKey = `${op.type}-${i}-${op.text.slice(0, 24)}`;
            return (
              <div
                key={stableKey}
                className={cn(
                  "flex min-w-0 items-start",
                  op.type === "add" && "bg-[hsl(var(--success)/0.1)] text-success",
                  op.type === "remove" && "bg-[hsl(var(--destructive)/0.1)] text-destructive",
                  op.type === "context" && "text-foreground/80",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "w-4 shrink-0 select-none text-center",
                    op.type === "add" && "text-success",
                    op.type === "remove" && "text-destructive",
                    op.type === "context" && "text-muted-foreground/60",
                  )}
                >
                  {op.type === "add" ? "+" : op.type === "remove" ? "-" : " "}
                </span>
                <span className="min-w-0 flex-1 whitespace-pre pr-2">{op.text || " "}</span>
              </div>
            );
          })}
        </div>
      )}

      {approval && <ApprovalFooter isPending={isPending} approval={approval} />}
    </section>
  );
});
