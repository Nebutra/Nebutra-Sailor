import type { ReactNode } from "react";

/**
 * Console content frame — wide, tight padding (not marketing py-12 / max-w-2xl).
 */
export function PageFrame({
  children,
  width = "wide",
  className,
  title,
  description,
  actions,
}: {
  children: ReactNode;
  width?: "wide" | "content";
  className?: string;
  /** Compact page title row (preferred over large PageHeader) */
  title?: string;
  description?: string;
  actions?: ReactNode;
}) {
  const max = width === "wide" ? "max-w-[1280px]" : "max-w-4xl";
  return (
    <div
      className={["mx-auto w-full px-4 py-4 md:px-5 md:py-5", max, className]
        .filter(Boolean)
        .join(" ")}
    >
      {title ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-neutral-6 pb-3">
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-neutral-12">{title}</h1>
            {description ? (
              <p className="mt-0.5 max-w-3xl text-xs leading-snug text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
