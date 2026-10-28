import { cn } from "../utils/cn";
import { EDITORIAL_EYEBROW } from "./editorial-surface";

export type EditorialMarginNoteProps = {
  children?: string | null;
  className?: string;
  label?: string;
  title?: string | null;
};

/**
 * Short aside that steps out into the right margin on wide screens.
 *
 * Below `xl` there is no margin to step into, so it degrades to an indented
 * inline note rather than a floated box that would strand a two-word orphan
 * beside it.
 */
export function EditorialMarginNote({
  children,
  className,
  label,
  title,
}: EditorialMarginNoteProps) {
  if (!title && !children) return null;

  return (
    <aside
      className={cn(
        "my-6 border-s-2 border-border py-1 ps-4 text-sm leading-6 text-muted-foreground",
        "xl:float-end xl:-me-56 xl:my-2 xl:ms-8 xl:w-48 xl:border-s xl:ps-4",
        className,
      )}
    >
      {label && <div className={cn("mb-1.5", EDITORIAL_EYEBROW)}>{label}</div>}
      {title && <p className="font-semibold text-foreground">{title}</p>}
      {children && <p className={cn(title && "mt-1")}>{children}</p>}
    </aside>
  );
}
