import { ArrowRight, ChevronDown, ChevronUp } from "@nebutra/icons";
import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BrandMark } from "@/components/brand-marks";
import {
  formatPrice,
  type ListingModel,
  PROVIDER_LABEL,
  resolveListingProvider,
} from "@/lib/listing-catalog";

export type ShelfSort =
  | "default"
  | "price-asc"
  | "price-desc"
  | "output-asc"
  | "output-desc"
  | "context-asc"
  | "context-desc";

type SortableColumn = "context" | "price" | "output";

/** Sort keys per column, ascending first. `price` is the input price. */
const SORT_KEYS: Record<SortableColumn, readonly [ShelfSort, ShelfSort]> = {
  context: ["context-asc", "context-desc"],
  price: ["price-asc", "price-desc"],
  output: ["output-asc", "output-desc"],
};

function detailHref(m: ListingModel) {
  return `/product/detail/${encodeURIComponent(m.publicModel)}`;
}

/**
 * A secondary line worth reading: the catalogue's display name when it says
 * something the id does not. Many entries carry the id again as their name,
 * and repeating it is noise — so nothing is printed rather than a filler.
 */
function displayName(m: ListingModel): string | null {
  const name = m.description || m.name;
  if (!name) return null;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return norm(name) === norm(m.publicModel) ? null : name;
}

/**
 * The shelf as a comparison table, the way OpenRouter and Vercel AI Gateway
 * list models: one 44px row per model, the numbers a buyer compares in fixed,
 * right-aligned, tabular columns; the whole row is the link.
 *
 * Only fields the catalogue really has: context and input/output price per 1M
 * tokens. There is no latency, throughput or uptime column because none is
 * measured per model yet. An unknown value is an empty cell with a screen-reader
 * label, never a dash.
 *
 * Below `md` each row folds into a stacked row: id over a meta line, nothing
 * truncated.
 *
 * `sortHref`, when given, turns the numeric headers into sort links (no JS).
 */
export function ModelTable({
  models,
  className,
  caption,
  sort = "default",
  sortHref,
  stickyHeader = false,
}: {
  models: readonly ListingModel[];
  className?: string;
  /** Accessible name for the table; visually hidden. */
  caption: string;
  sort?: ShelfSort;
  sortHref?: (sort: ShelfSort) => string;
  stickyHeader?: boolean;
}) {
  const t = useTranslations("shelf");
  const tCat = useTranslations("category");
  const sticky = stickyHeader && "sticky top-14 z-[var(--layer-raised)] bg-card";
  const th =
    "h-10 border-b border-border px-4 text-xs font-medium whitespace-nowrap text-muted-foreground";

  const header = (column: SortableColumn, label: string) => {
    const [asc, desc] = SORT_KEYS[column];
    const active = sort === asc ? "asc" : sort === desc ? "desc" : null;
    const content = (
      <>
        {label}
        {active === "asc" ? (
          <ChevronUp aria-hidden className="size-3.5" />
        ) : active === "desc" ? (
          <ChevronDown aria-hidden className="size-3.5" />
        ) : null}
      </>
    );
    return (
      <th
        scope="col"
        aria-sort={active === "asc" ? "ascending" : active === "desc" ? "descending" : undefined}
        className={cn(th, "w-32 text-right", sticky, active && "text-foreground")}
      >
        {sortHref ? (
          <Link
            href={sortHref(active === "asc" ? desc : asc)}
            className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
          >
            {content}
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1">{content}</span>
        )}
      </th>
    );
  };

  const unknown = <span className="sr-only">{t("unknown")}</span>;
  const cell = "border-b border-border";
  const num = cn(cell, "hidden px-4 text-right font-mono text-sm tabular-nums md:table-cell");

  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] border border-border bg-card shadow-glass-sm",
        className,
      )}
    >
      <table className="w-full border-separate border-spacing-0 text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="hidden md:table-header-group">
          <tr>
            <th scope="col" className={cn(th, "rounded-tl-[var(--radius-xl)] text-left", sticky)}>
              {t("col.model")}
            </th>
            {header("context", t("col.context"))}
            {header("price", t("col.inputPerM"))}
            {header("output", t("col.outputPerM"))}
            <th scope="col" className={cn(th, "w-10 rounded-tr-[var(--radius-xl)]", sticky)}>
              <span className="sr-only">{t("col.open")}</span>
            </th>
          </tr>
        </thead>
        <tbody className="[&>tr:last-child>td]:border-b-0 [&>tr:last-child>td:first-child]:rounded-bl-[var(--radius-xl)] [&>tr:last-child>td:last-child]:rounded-br-[var(--radius-xl)]">
          {models.map((m) => {
            const provider = resolveListingProvider(m);
            const hasIn = m.inputPerMTok > 0;
            const hasOut = m.outputPerMTok > 0;
            // Narrow rows: who and what on one line, the numbers on the next,
            // each number kept whole so a price never breaks across lines.
            const numbers = [
              m.context ? t("meta.context", { context: m.context }) : null,
              hasIn ? t("meta.input", { price: formatPrice(m.inputPerMTok) }) : null,
              hasOut ? t("meta.output", { price: formatPrice(m.outputPerMTok) }) : null,
            ].filter((x): x is string => x !== null);
            return (
              <tr
                key={m.publicModel}
                className="group relative transition-colors hover:bg-muted/50"
              >
                <td className={cn(cell, "px-4 py-3 md:h-14 md:py-0")}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-border bg-card shadow-glass-sm">
                      <BrandMark provider={provider} size={14} />
                    </span>
                    <Link
                      href={detailHref(m)}
                      className="min-w-0 font-mono text-sm font-medium break-all text-foreground after:absolute after:inset-0 md:truncate md:break-normal"
                    >
                      {m.publicModel}
                    </Link>
                    <span className="hidden shrink-0 text-sm text-muted-foreground lg:inline">
                      {PROVIDER_LABEL[provider]}
                    </span>
                  </div>
                  <div className="mt-1 space-y-0.5 pl-10 text-xs text-muted-foreground tabular-nums md:hidden">
                    <p>
                      {PROVIDER_LABEL[provider]} · {tCat(m.category)}
                    </p>
                    {numbers.length > 0 ? (
                      <p className="flex flex-wrap gap-x-3">
                        {numbers.map((n) => (
                          <span key={n} className="whitespace-nowrap">
                            {n}
                          </span>
                        ))}
                      </p>
                    ) : null}
                  </div>
                </td>
                <td className={num}>{m.context || unknown}</td>
                <td className={num}>{hasIn ? formatPrice(m.inputPerMTok) : unknown}</td>
                <td className={num}>{hasOut ? formatPrice(m.outputPerMTok) : unknown}</td>
                <td className={cn(cell, "hidden pr-4 text-muted-foreground md:table-cell")}>
                  <ArrowRight
                    aria-hidden
                    className="size-4 opacity-0 transition-[opacity,transform,translate] group-hover:translate-x-0.5 group-hover:opacity-100"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The shelf as a list, OpenRouter's default: id and provider, the catalogue's
 * own display name when it adds something, then a meta line of the real
 * numbers. Rows without a known value simply have a shorter meta line.
 */
export function ModelList({
  models,
  className,
  label,
}: {
  models: readonly ListingModel[];
  className?: string;
  label: string;
}) {
  const t = useTranslations("shelf");
  const tCat = useTranslations("category");
  return (
    <ul
      aria-label={label}
      className={cn(
        "divide-y divide-border rounded-[var(--radius-xl)] border border-border bg-card shadow-glass-sm",
        className,
      )}
    >
      {models.map((m) => {
        const provider = resolveListingProvider(m);
        const name = displayName(m);
        const meta = [
          tCat(m.category),
          m.context ? t("meta.context", { context: m.context }) : null,
          m.inputPerMTok > 0 ? t("meta.input", { price: formatPrice(m.inputPerMTok) }) : null,
          m.outputPerMTok > 0 ? t("meta.output", { price: formatPrice(m.outputPerMTok) }) : null,
        ].filter(Boolean);
        return (
          <li
            key={m.publicModel}
            className="group relative px-4 py-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-border bg-card shadow-glass-sm">
                <BrandMark provider={provider} size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <Link
                    href={detailHref(m)}
                    className="font-mono text-sm font-medium break-all text-foreground after:absolute after:inset-0"
                  >
                    {m.publicModel}
                  </Link>
                  <span className="text-sm text-muted-foreground">{PROVIDER_LABEL[provider]}</span>
                </div>
                {name ? <p className="mt-1 text-sm text-muted-foreground">{name}</p> : null}
                <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
                  {meta.join(" · ")}
                </p>
              </div>
              <ArrowRight
                aria-hidden
                className="mt-2 hidden size-4 shrink-0 text-muted-foreground opacity-0 transition-[opacity,transform,translate] group-hover:translate-x-0.5 group-hover:opacity-100 md:block"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
