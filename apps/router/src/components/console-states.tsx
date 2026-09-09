"use client";

import { Button } from "@nebutra/ui/primitives";
import type { ReactNode } from "react";
import type { ConsoleResource } from "@/lib/use-console-resource";

/**
 * The four states, in one place.
 *
 * Loading is a skeleton with the shape of the answer, so the layout does not
 * jump. Empty says what is missing and how to fix it. Error says what went
 * wrong and offers a retry. Populated is the data. Nothing renders two of them
 * at once, and an error never renders as an empty result.
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-[var(--radius-sm)] bg-[var(--neutral-3)] ${className}`}
    />
  );
}

export function SkeletonRows({ rows = 4, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2 p-3" aria-hidden>
      {Array.from({ length: rows }, (_, row) => (
        <div
          key={`row-${row}`}
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }, (_, column) => (
            <Skeleton key={`cell-${row}-${column}`} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatePanel({
  tone = "neutral",
  title,
  description,
  action,
}: {
  tone?: "neutral" | "error";
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const isError = tone === "error";
  return (
    <div
      role={isError ? "alert" : undefined}
      className={[
        "flex flex-col items-center justify-center gap-2 px-4 py-10 text-center",
        isError ? "text-[var(--status-danger)]" : "text-[var(--neutral-11)]",
      ].join(" ")}
    >
      <p className="text-[13px] font-medium">{title}</p>
      {description ? (
        <p className="max-w-md text-[12px] leading-snug text-[var(--neutral-10)]">{description}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export function RetryButton({ onRetry, label = "重试" }: { onRetry: () => void; label?: string }) {
  return (
    <Button type="button" variant="outline" size="sm" className="h-7" onClick={onRetry}>
      {label}
    </Button>
  );
}

/**
 * Render exactly one of the four states for a {@link ConsoleResource}.
 *
 * `isEmpty` is asked only of loaded data — which is what keeps "no rows" and
 * "the request failed" from collapsing into the same grey sentence.
 */
export function AsyncSection<T>({
  resource,
  onRetry,
  isEmpty,
  emptyTitle,
  emptyDescription,
  emptyAction,
  skeleton,
  children,
}: {
  resource: ConsoleResource<T>;
  onRetry: () => void;
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  skeleton?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (resource.status === "error") {
    return (
      <StatePanel
        tone="error"
        title="这块内容没能加载出来"
        description={resource.error}
        action={<RetryButton onRetry={onRetry} />}
      />
    );
  }
  if (resource.status === "loading" && resource.data === null) {
    return <>{skeleton ?? <SkeletonRows />}</>;
  }
  const data = resource.data;
  if (data === null) return <>{skeleton ?? <SkeletonRows />}</>;
  if (isEmpty?.(data)) {
    return (
      <StatePanel
        title={emptyTitle ?? "这段时间没有记录"}
        {...(emptyDescription ? { description: emptyDescription } : {})}
        {...(emptyAction ? { action: emptyAction } : {})}
      />
    );
  }
  return <>{children(data)}</>;
}
