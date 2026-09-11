"use client";

import { EmptyState, ErrorState } from "@nebutra/ui/layout";
import type { ReactNode } from "react";

/** The subset of a react-query result this needs. Keeps the pattern usable with any query hook. */
export interface AsyncQuery {
  isLoading: boolean;
  isError?: boolean;
  refetch?: () => unknown;
}

export interface AsyncSurfaceProps {
  query: AsyncQuery;
  /** True when the request succeeded and there is genuinely nothing to show. */
  isEmpty?: boolean;
  /** Shape of the eventual content, so the layout does not jump when data lands. */
  skeleton: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  /**
   * Replaces the default EmptyState entirely. For places where the design system's centred block is
   * the wrong shape — a 300px drawer, an inline strip — and a line of copy is the right one.
   */
  empty?: ReactNode;
  errorTitle?: string;
  errorMessage?: string;
  children: ReactNode;
}

/**
 * One place where a query's states become a surface.
 *
 * Every async view in this app has four outcomes and most of them rendered one. `data?.map(...)`
 * draws an empty grid while loading, an empty grid on failure, and an empty grid when the account
 * genuinely has nothing — three different situations the user cannot tell apart, and two of them
 * look like the page is broken. Constitution §12.1: an unevaluated state is a defect.
 *
 * Composed from @nebutra/ui/layout rather than hand-rolled. Those components existed the whole
 * time; PARA had used none of them.
 */
export function AsyncSurface({
  query,
  isEmpty = false,
  skeleton,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyAction,
  empty,
  errorTitle = "This could not be loaded",
  errorMessage,
  children,
}: AsyncSurfaceProps) {
  if (query.isLoading) return <>{skeleton}</>;

  if (query.isError) {
    return (
      <ErrorState
        title={errorTitle}
        {...(errorMessage ? { message: errorMessage } : {})}
        {...(query.refetch ? { onRetry: () => void query.refetch?.() } : {})}
      />
    );
  }

  if (isEmpty) {
    if (empty) return <>{empty}</>;
    return (
      <EmptyState
        title={emptyTitle}
        {...(emptyDescription ? { description: emptyDescription } : {})}
        {...(emptyAction ? { action: emptyAction } : {})}
      />
    );
  }

  return <>{children}</>;
}
