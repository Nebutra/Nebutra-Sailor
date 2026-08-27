/**
 * Shared Forge runner chrome — keep every tool workspace on one visual contract.
 * Server-safe pure components (no client-only cn from utils).
 */
import type { ReactNode } from "react";

/** Styled DS listbox — see runner-select.tsx (client). Re-exported for stable import path. */
export { RunnerSelect, type RunnerSelectOption } from "@/components/runner-select";

const ERROR =
  "rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--status-danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--status-danger)_8%,transparent)] p-3 text-sm text-[var(--status-danger)]";

const OUTPUT =
  "overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-3 font-mono text-sm";

const NOTE = "text-xs text-[var(--neutral-10)]";

export function RunnerError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <pre className={ERROR}>{children}</pre>;
}

export function RunnerOutput({ children, className }: { children: ReactNode; className?: string }) {
  if (!children) return null;
  return <pre className={[OUTPUT, className].filter(Boolean).join(" ")}>{children}</pre>;
}

export function RunnerNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className={NOTE}>{children}</p>;
}

export function RunnerPanel({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {title ? <p className="mb-1 text-xs font-medium text-[var(--neutral-10)]">{title}</p> : null}
      {children}
    </div>
  );
}
