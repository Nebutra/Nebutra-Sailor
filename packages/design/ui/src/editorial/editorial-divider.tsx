import { cn } from "../utils/cn";

export type EditorialDividerProps = {
  className?: string;
};

/**
 * Section break inside an article.
 *
 * Marks a change of movement, not a new heading — an `<hr>` with a centred
 * marker rather than a rule that would read as the end of the piece.
 */
export function EditorialDivider({ className }: EditorialDividerProps) {
  return (
    <div className={cn("my-14 flex items-center gap-4", className)}>
      <hr className="h-px flex-1 border-0 bg-border" />
      <span aria-hidden className="size-1.5 rounded-full bg-[hsl(var(--primary))]" />
      <hr className="h-px flex-1 border-0 bg-border" />
    </div>
  );
}
