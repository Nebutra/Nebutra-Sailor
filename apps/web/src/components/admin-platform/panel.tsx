import { cn } from "@nebutra/ui/utils";
import type { ReactNode } from "react";

/**
 * The one container the console uses: hairline border, 8 px radius, a
 * 14/20 semibold title row with an optional count, and whatever goes below.
 */
export function Panel({
  title,
  count,
  description,
  aside,
  className,
  children,
}: {
  title: string;
  count?: string | number | undefined;
  description?: string | undefined;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-border border-b px-4 py-3.5">
        <div className="min-w-0">
          <h2 className="font-semibold text-sm leading-5">
            {title}
            {count !== undefined && count !== "" ? (
              <span className="ml-2 font-normal text-muted-foreground text-xs">{count}</span>
            ) : null}
          </h2>
          {description ? (
            <p className="mt-0.5 text-muted-foreground text-xs leading-4">{description}</p>
          ) : null}
        </div>
        {aside ? <div className="flex shrink-0 items-center gap-2">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function PageTitle({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h1 className="font-[450] text-2xl leading-8 tracking-[-0.02em]">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-muted-foreground text-sm leading-5">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
