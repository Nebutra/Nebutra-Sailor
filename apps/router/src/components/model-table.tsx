import { ArrowRight } from "@nebutra/icons";
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

/**
 * The shelf as a table, the way OpenRouter and Vercel AI Gateway list models:
 * one row per model, the numbers a buyer compares in fixed right-aligned
 * columns, the whole row a link. Server-rendered — no client JS.
 *
 * Only fields the catalogue really has are shown: context, input and output
 * price. Latency, throughput and uptime are not measured per model yet, so
 * there is no column for them rather than an invented one.
 *
 * Below `md` the columns fold into a two-line row: name over a meta line.
 */
export function ModelTable({
  models,
  className,
  caption,
}: {
  models: readonly ListingModel[];
  className?: string;
  /** Accessible name for the table; visually hidden. */
  caption: string;
}) {
  const t = useTranslations("shelf");
  const tCat = useTranslations("category");

  return (
    <div
      className={cn("overflow-hidden rounded-[var(--radius-lg)] border border-border", className)}
    >
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="hidden bg-muted/40 text-xs text-muted-foreground md:table-header-group">
          <tr className="border-b border-border">
            <th scope="col" className="px-4 py-2.5 text-left font-medium">
              {t("col.model")}
            </th>
            <th scope="col" className="w-28 px-4 py-2.5 text-right font-medium">
              {t("col.context")}
            </th>
            <th scope="col" className="w-32 px-4 py-2.5 text-right font-medium">
              {t("col.input")}
            </th>
            <th scope="col" className="w-32 px-4 py-2.5 text-right font-medium">
              {t("col.output")}
            </th>
            <th scope="col" className="w-10 px-2 py-2.5">
              <span className="sr-only">{t("col.open")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => {
            const provider = resolveListingProvider(m);
            const href = `/product/detail/${encodeURIComponent(m.publicModel)}`;
            const input = formatPrice(m.inputPerMTok);
            const output = formatPrice(m.outputPerMTok);
            return (
              <tr
                key={m.publicModel}
                className="group relative border-b border-border transition-colors last:border-b-0 hover:bg-accent/60"
              >
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-border bg-card">
                      <BrandMark provider={provider} size={16} />
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={href}
                        className="block truncate font-mono text-sm font-medium text-foreground after:absolute after:inset-0"
                      >
                        {m.publicModel}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {PROVIDER_LABEL[provider]} · {tCat(m.category)}
                        {m.context ? <span className="md:hidden"> · {m.context}</span> : null}
                        <span className="md:hidden">
                          {" · "}
                          {t("metaLine", { input, output })}
                        </span>
                      </p>
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-right font-mono text-sm tabular-nums text-foreground md:table-cell">
                  {m.context || "—"}
                </td>
                <td className="hidden px-4 py-3 text-right font-mono text-sm tabular-nums text-foreground md:table-cell">
                  {input}
                </td>
                <td className="hidden px-4 py-3 text-right font-mono text-sm tabular-nums text-foreground md:table-cell">
                  {output}
                </td>
                <td className="hidden px-2 py-3 text-muted-foreground md:table-cell">
                  <ArrowRight
                    aria-hidden
                    className="size-4 transition-transform group-hover:translate-x-0.5"
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
