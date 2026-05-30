import type { ReactNode } from "react";

export type AppearanceSectionProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
};

export function AppearanceSection({
  title,
  description,
  action,
  children,
}: AppearanceSectionProps) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-card p-4">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      {children ? <div className="mt-4 border-t border-border pt-4">{children}</div> : null}
    </section>
  );
}
