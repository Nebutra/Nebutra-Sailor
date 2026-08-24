import { ArrowUpRight } from "@nebutra/icons";
import { cn } from "../utils/cn";
import { EDITORIAL_BODY, EDITORIAL_EYEBROW, editorialBlock } from "./editorial-surface";

export type EditorialSourceItem = {
  accessedAt?: string | null;
  author?: string | null;
  key?: string;
  publisher?: string | null;
  summary?: string | null;
  title: string;
  url: string;
};

export type EditorialSourceIndexProps = {
  className?: string;
  /** Eyebrow copy, e.g. "Source index" / "资料索引". */
  label?: string;
  sources: EditorialSourceItem[];
  /** Sentence under the eyebrow. Apps build this so pluralization stays localized. */
  summary?: string | null;
};

function hostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Numbered reference list closing a researched piece.
 *
 * A numbered hairline list rather than a card grid: references are read in
 * order and cited by number from the body, and boxing each one hides that
 * ordering behind a wall of equal-weight rectangles.
 */
export function EditorialSourceIndex({
  className,
  label = "Source index",
  sources,
  summary,
}: EditorialSourceIndexProps) {
  const visible = sources.filter((source) => source.title && source.url);
  if (!visible.length) return null;

  return (
    <section
      aria-label={label}
      className={cn(editorialBlock({ spacing: "loose", width: "breakout" }), className)}
    >
      <div className="border-b border-border pb-3">
        <div className={EDITORIAL_EYEBROW}>{label}</div>
        {summary && <p className={cn("mt-2", EDITORIAL_BODY)}>{summary}</p>}
      </div>
      <ol className="divide-y divide-border">
        {visible.map((source, index) => {
          const meta = [source.publisher, source.author, source.accessedAt].filter(Boolean);
          const host = hostname(source.url);

          return (
            <li key={source.key ?? source.url}>
              <a
                className="group flex gap-4 py-4 transition-colors hover:bg-muted/60"
                href={source.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span
                  aria-hidden
                  className="mt-0.5 shrink-0 font-mono text-xs font-semibold tabular-nums text-muted-foreground"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-[0.9375rem] font-semibold leading-6 text-foreground">
                      {source.title}
                    </span>
                    <ArrowUpRight
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-[hsl(var(--primary))]"
                    />
                  </span>
                  {(meta.length > 0 || host) && (
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {(meta.length ? meta : [host]).join(" · ")}
                    </span>
                  )}
                  {source.summary && (
                    <span className="mt-1.5 block text-sm leading-6 text-muted-foreground">
                      {source.summary}
                    </span>
                  )}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
