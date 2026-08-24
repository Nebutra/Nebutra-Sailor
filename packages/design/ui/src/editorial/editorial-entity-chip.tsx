import type { ReactNode } from "react";
import { cn } from "../utils/cn";

export type EditorialEntityChipProps = {
  className?: string;
  href?: string | null;
  /** Logo slot. Apps pass their own image component so this stays framework-free. */
  logo?: ReactNode;
  name: string;
};

/**
 * Inline reference to a company, product or project.
 *
 * Sized to sit inside a sentence without changing its line height, which is
 * why the logo plate is `1em` rather than a fixed pixel size.
 */
export function EditorialEntityChip({ className, href, logo, name }: EditorialEntityChipProps) {
  if (!name.trim()) return null;

  const content = (
    <>
      {logo && (
        <span
          aria-hidden
          className="inline-flex size-[1.1em] shrink-0 items-center justify-center overflow-hidden rounded-[0.25em] bg-muted"
        >
          {logo}
        </span>
      )}
      <span>{name}</span>
    </>
  );

  const shared = cn(
    "mx-0.5 inline-flex items-baseline gap-1 align-baseline font-medium text-foreground",
    className,
  );

  if (!href) {
    return <span className={shared}>{content}</span>;
  }

  return (
    <a
      className={cn(
        shared,
        "underline decoration-border decoration-dotted underline-offset-4 transition-colors hover:decoration-[hsl(var(--primary))] hover:decoration-solid",
      )}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {content}
    </a>
  );
}
