"use client";

import { ArrowUpRight, ChevronRight, FileText } from "@nebutra/icons";
import { memo, type ReactElement, useCallback, useId, useState } from "react";
import { cn } from "../utils/cn";
import { TextShimmer } from "./text-shimmer";

/* -------------------------------------------------------------------------- *\
 *  SearchTool — inline AI tool-call rendering for search/retrieval results.
 *
 *  Sibling of EditTool / QuestionTool / McpTool / TodoTool — see the
 *  `project_tool_family_primitives` memory for the boundary contract.
 *
 *  Header: shimmer "Searching..." while pending, else "Found N result(s)".
 *  Body (expandable): a "Searched for 'query'" strip, then a scrollable
 *  list of result rows. Rows with a `url` render as real anchors with an
 *  ArrowUpRight affordance; rows without a url render as inert <li> (no
 *  fake hover — clickability is honest).
 *
 *  States:
 *    - pending    → shimmer header; expandable disabled
 *    - completed  → result count header; body expandable when results > 0
 *
 *  a11y:
 *    - <section aria-busy> reflects pending
 *    - Toggle button: aria-expanded + aria-controls → panel id
 *    - <header> in panel labels the result region
 *    - Result list: <ul aria-label="Search results">
 *    - Anchors carry rel="noopener noreferrer" + target="_blank"
\* -------------------------------------------------------------------------- */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SEARCH_DEFAULT_MAX_HEIGHT_PX = 200;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SearchResult = {
  /** Stable id. Falls back to url or title-based key. */
  id?: string;
  title: string;
  /** Originating domain or system (e.g. "google.com/flights", "Notion"). */
  source: string;
  /** Optional ISO date or display string. */
  date?: string;
  /** If provided, row renders as a real external link. */
  url?: string;
};

export type SearchToolState = "pending" | "completed";

export type SearchToolProps = {
  /** @default "completed" */
  state?: SearchToolState;
  /** Query text rendered in the expanded panel's strip. */
  query: string;
  /** Result rows. Empty or omitted → panel is not expandable. */
  results?: readonly SearchResult[];
  /** @default false */
  defaultOpen?: boolean;
  /** Controlled expand. Pair with `onExpandedChange`. */
  expanded?: boolean;
  onExpandedChange?: (next: boolean) => void;
  /** Scroll-container cap. @default 200 */
  maxResultsHeightPx?: number;
  className?: string;
};

// ---------------------------------------------------------------------------
// Result row (internal)
// ---------------------------------------------------------------------------

function SearchResultRow({ result }: { result: SearchResult }): ReactElement {
  const meta =
    result.date && result.source
      ? `${result.source} · ${result.date}`
      : result.source || result.date || "";
  const isLink = !!result.url;

  const inner = (
    <>
      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
        <FileText className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{result.title}</span>
      {meta && (
        <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{meta}</span>
      )}
      {isLink && (
        <ArrowUpRight
          className="h-3 w-3 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
          aria-hidden="true"
        />
      )}
    </>
  );

  const baseCls = "flex items-center gap-2 rounded-md px-2 py-1";

  if (isLink) {
    return (
      <li>
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(baseCls, "group cursor-pointer hover:bg-accent focus-visible:bg-accent")}
        >
          {inner}
        </a>
      </li>
    );
  }

  return <li className={cn(baseCls, "cursor-default")}>{inner}</li>;
}

// ---------------------------------------------------------------------------
// SearchTool
// ---------------------------------------------------------------------------

export const SearchTool = memo(function SearchTool({
  state = "completed",
  query,
  results = [],
  defaultOpen = false,
  expanded,
  onExpandedChange,
  maxResultsHeightPx = SEARCH_DEFAULT_MAX_HEIGHT_PX,
  className,
}: SearchToolProps): ReactElement {
  const panelId = useId();
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
  const totalResults = results.length;
  const expandable = !isPending && totalResults > 0;

  const handleToggle = useCallback(() => {
    if (!expandable) return;
    setOpen(!isOpen);
  }, [expandable, isOpen, setOpen]);

  const headerLabel = isPending
    ? "Searching..."
    : `Found ${totalResults} result${totalResults === 1 ? "" : "s"}`;

  return (
    <section
      aria-busy={isPending || undefined}
      aria-label={`Search: ${query}`}
      className={cn("flex w-full flex-col gap-2", className)}
    >
      <button
        type="button"
        onClick={handleToggle}
        disabled={!expandable}
        aria-expanded={expandable ? isOpen : undefined}
        aria-controls={expandable ? panelId : undefined}
        className={cn(
          "group m-0 flex max-w-full select-none items-center gap-1 border-0 bg-transparent p-0 text-left",
          expandable ? "cursor-pointer" : "cursor-default",
        )}
      >
        <span className="shrink-0 whitespace-nowrap text-sm font-medium text-muted-foreground">
          {isPending ? (
            <TextShimmer as="span" className="text-sm">
              {headerLabel}
            </TextShimmer>
          ) : (
            headerLabel
          )}
        </span>
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
        <div id={panelId} className="overflow-hidden rounded-lg border border-border bg-muted">
          <header className="flex h-7 items-center gap-1 border-b border-border px-2.5 text-xs">
            <span className="font-medium text-foreground">Searched for</span>
            <span className="truncate text-muted-foreground">&ldquo;{query}&rdquo;</span>
          </header>
          <div className="overflow-y-auto bg-card" style={{ maxHeight: `${maxResultsHeightPx}px` }}>
            <ul aria-label="Search results" className="flex flex-col gap-1 p-1">
              {results.map((result, idx) => {
                const key = result.id ?? result.url ?? `${idx}-${result.title.slice(0, 16)}`;
                return <SearchResultRow key={key} result={result} />;
              })}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
});
