import { cn } from "@nebutra/ui/utils";
import type { ReactNode } from "react";

/** The one card on every public page: 1px border, radius 8, card surface. */
export function Card({
  labelledBy,
  className,
  children,
}: {
  labelledBy?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={cn("overflow-hidden rounded-lg border border-border bg-card", className)}
    >
      {children}
    </section>
  );
}

/** Card title row: 16/500 title, muted aside on the right, an optional muted note below. */
export function CardHeader({
  id,
  title,
  aside,
  note,
}: {
  id: string;
  title: string;
  aside?: ReactNode;
  note?: string | null;
}) {
  return (
    <div className="border-b border-border px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-base font-medium text-foreground">
          {title}
        </h2>
        {aside ? <span className="text-sm text-muted-foreground">{aside}</span> : null}
      </div>
      {note ? <p className="mt-0.5 text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}
