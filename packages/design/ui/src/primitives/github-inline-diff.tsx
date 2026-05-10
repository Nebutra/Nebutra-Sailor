"use client";

import { CheckCircle2, MessageSquarePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { Avatar, AvatarFallback } from "./avatar";
import { Badge } from "./badge";
import { Button } from "./button";
import { Separator } from "./separator";
import { Textarea } from "./textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

// =============================================================================
// Types
// =============================================================================

export type DiffLineKind = "hunk" | "context" | "add" | "del";

export type DiffLine =
  | { kind: "hunk"; content: string }
  | { kind: "context"; old: number | null; new: number | null; content: string }
  | { kind: "add"; old: null; new: number; content: string }
  | { kind: "del"; old: number; new: null; content: string };

export interface DiffComment {
  id: string;
  author: string;
  initials: string;
  body: string;
  createdAt: string;
}

export interface GithubInlineDiffProps {
  /** Array of diff lines */
  diff: readonly DiffLine[];
  /** File name to display in header */
  fileName: string;
  /** File status badge text */
  fileStatus?: string;
  /** Initial comments per line (keyed by line index) */
  initialComments?: Record<number, DiffComment[]>;
  /** Callback when a new comment is added */
  onAddComment?: (lineIndex: number, comment: DiffComment) => void;
  /** Callback when thread resolve status changes */
  onResolveChange?: (lineIndex: number, resolved: boolean) => void;
  /** Current user info for new comments */
  currentUser?: { name: string; initials: string };
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// InlineThread Component
// =============================================================================

interface InlineThreadProps {
  comments: DiffComment[];
  resolved: boolean;
  onToggleResolve: () => void;
  onClose: () => void;
  onAddComment: (comment: DiffComment) => void;
  currentUser: { name: string; initials: string };
}

function InlineThread({
  comments,
  resolved,
  onToggleResolve,
  onClose,
  onAddComment,
  currentUser,
}: InlineThreadProps) {
  const [draft, setDraft] = useState("");
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  function addComment() {
    const text = draft.trim();
    if (!text) return;

    onAddComment({
      id: crypto.randomUUID(),
      author: currentUser.name,
      initials: currentUser.initials,
      body: text,
      createdAt: "now",
    });

    setDraft("");
    requestAnimationFrame(() => textRef.current?.focus());
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="rounded-[var(--radius-md)] border bg-card dark:border-white/10">
      {/* Header with status chip */}
      <div className="flex items-center justify-between gap-2 px-2 py-1">
        <div className="flex items-center gap-2">
          <Badge
            className={cn(
              "h-5 gap-1 px-1.5 text-[11px]",
              resolved
                ? "bg-emerald-600 text-white hover:bg-emerald-600/90 dark:bg-emerald-500 dark:hover:bg-emerald-500/90"
                : "bg-secondary text-foreground dark:bg-muted dark:text-foreground",
            )}
          >
            {resolved ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
            {resolved ? "Resolved" : "Open"}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant={resolved ? "secondary" : "default"}
            size="sm"
            onClick={onToggleResolve}
            aria-pressed={resolved}
            className="h-7 px-2 text-[12px]"
          >
            {resolved ? "Reopen" : "Resolve"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close thread"
            onClick={onClose}
            className="h-7 w-7"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Comments list */}
      <ul className="space-y-1 px-2 py-1.5">
        {comments.map((c) => (
          <li key={c.id} className="flex items-start gap-2">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[9px]">{c.initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[12px] font-medium">{c.author}</p>
                <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                  {c.createdAt}
                </span>
              </div>
              <p className="mt-0.5 text-[13px] leading-5">{c.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <Separator />

      {/* Editor */}
      <div className="flex flex-col gap-2 px-2 py-1.5">
        <label htmlFor="inline-comment" className="sr-only">
          Add a comment
        </label>
        <Textarea
          id="inline-comment"
          ref={textRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Comment"
          rows={2}
          className="min-h-[40px] py-1.5 text-[13px]"
        />
        <div className="flex items-center justify-end gap-1.5">
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 px-2 text-[12px]">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={addComment}
            disabled={!draft.trim()}
            className="h-7 px-2 text-[12px]"
          >
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// GithubInlineDiff Component
// =============================================================================

/**
 * GithubInlineDiff - GitHub-style diff viewer with inline comments
 *
 * A code diff viewer that allows inline commenting on individual lines,
 * similar to GitHub's pull request review interface.
 *
 * @example Basic usage
 * ```tsx
 * const diff = [
 *   { kind: "hunk", content: "@@ -12,7 +12,9 @@" },
 *   { kind: "context", old: 12, new: 12, content: "export function foo() {" },
 *   { kind: "del", old: 13, new: null, content: "  const x = 1" },
 *   { kind: "add", old: null, new: 13, content: "  const x = 2" },
 *   { kind: "context", old: 14, new: 14, content: "}" },
 * ];
 *
 * <GithubInlineDiff diff={diff} fileName="src/utils.ts" />
 * ```
 *
 * @example With callbacks
 * ```tsx
 * <GithubInlineDiff
 *   diff={diff}
 *   fileName="src/server.ts"
 *   fileStatus="modified"
 *   currentUser={{ name: "John", initials: "JD" }}
 *   onAddComment={(lineIdx, comment) => console.log(lineIdx, comment)}
 *   onResolveChange={(lineIdx, resolved) => console.log(lineIdx, resolved)}
 * />
 * ```
 */
export function GithubInlineDiff({
  diff,
  fileName,
  fileStatus = "modified",
  initialComments = {},
  onAddComment,
  onResolveChange,
  currentUser = { name: "You", initials: "YO" },
  className,
}: GithubInlineDiffProps) {
  const rows = Array.isArray(diff) ? diff : ([] as readonly DiffLine[]);

  const [openThreadAt, setOpenThreadAt] = useState<number | null>(null);
  const [resolvedMap, setResolvedMap] = useState<Record<number, boolean>>({});
  const [commentsMap, setCommentsMap] = useState<Record<number, DiffComment[]>>(initialComments);

  function toggleResolve(idx: number) {
    const newResolved = !resolvedMap[idx];
    setResolvedMap((m) => ({ ...m, [idx]: newResolved }));
    onResolveChange?.(idx, newResolved);
  }

  function handleAddComment(idx: number, comment: DiffComment) {
    setCommentsMap((m) => ({
      ...m,
      [idx]: [...(m[idx] || []), comment],
    }));
    onAddComment?.(idx, comment);
  }

  return (
    <TooltipProvider delayDuration={150}>
      {/* biome-ignore lint/a11y/useSemanticElements: ARIA custom grid */}
      <div
        role="table"
        aria-label={`Diff of ${fileName}`}
        className={cn("rounded-[var(--radius-md)] border bg-card dark:border-white/10", className)}
      >
        <div className="flex items-center justify-between border-b px-2 py-1 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium">{fileName}</span>
            <Badge variant="secondary" aria-label="File status" className="h-5 px-1.5 text-[11px]">
              {fileStatus}
            </Badge>
          </div>
        </div>

        {/* biome-ignore lint/a11y/useSemanticElements: ARIA custom grid */}
        <ol role="rowgroup" className="divide-y dark:divide-white/10">
          {rows.map((line, idx) => {
            const isChange = line.kind === "add" || line.kind === "del";
            const isOpen = openThreadAt === idx;
            const isResolved = !!resolvedMap[idx];
            const lineComments = commentsMap[idx] || [];

            return (
              <li
                key={idx}
                className={cn(
                  "group relative flex items-stretch text-[13px]",
                  line.kind === "hunk" && "bg-muted/50 text-muted-foreground",
                  line.kind === "add" && "bg-emerald-50/60 dark:bg-emerald-950/20",
                  line.kind === "del" && "bg-rose-50/60 dark:bg-rose-950/20",
                )}
              >
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  {line.kind !== "hunk" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="secondary"
                          aria-label="Add inline comment"
                          className="h-5 w-5 rounded-full shadow-sm"
                          onClick={() => setOpenThreadAt(isOpen ? null : idx)}
                        >
                          <MessageSquarePlus className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">Add comment</TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* biome-ignore lint/a11y/useSemanticElements: ARIA custom grid */}
                <div
                  role="cell"
                  className={cn(
                    "grid w-16 shrink-0 grid-cols-2 border-r text-[11px] text-muted-foreground dark:border-white/10",
                  )}
                >
                  <span className="px-2 py-1 text-right tabular-nums">
                    {line.kind === "add" ? "" : line.kind === "hunk" ? "" : (line.old ?? "")}
                  </span>
                  <span className="px-2 py-1 text-right tabular-nums">
                    {line.kind === "del" ? "" : line.kind === "hunk" ? "" : (line.new ?? "")}
                  </span>
                </div>

                {/* biome-ignore lint/a11y/useSemanticElements: ARIA custom grid */}
                <div role="cell" className="flex-1">
                  <pre
                    className={cn(
                      "whitespace-pre-wrap px-2 py-1 font-mono text-[12px] leading-5",
                      isChange && "pl-5",
                    )}
                    aria-label={`${line.kind} line`}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mr-1 inline-block w-2 text-center font-semibold",
                        line.kind === "add" && "text-emerald-600",
                        line.kind === "del" && "text-rose-600",
                      )}
                    >
                      {line.kind === "add" ? "+" : line.kind === "del" ? "-" : " "}
                    </span>
                    {line.content}
                  </pre>

                  {isOpen && line.kind !== "hunk" && (
                    <div className="border-t bg-background px-2 py-1.5 dark:border-white/10">
                      <InlineThread
                        comments={lineComments}
                        resolved={isResolved}
                        onToggleResolve={() => toggleResolve(idx)}
                        onClose={() => setOpenThreadAt(null)}
                        onAddComment={(comment) => handleAddComment(idx, comment)}
                        currentUser={currentUser}
                      />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </TooltipProvider>
  );
}
