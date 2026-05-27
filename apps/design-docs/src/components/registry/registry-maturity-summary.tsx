import Link from "next/link";
import type { RegistryCardItem } from "./registry-card";

const MATURITY_ORDER = ["canonical", "stable", "beta", "experimental"] as const;

type RegistryMaturity = (typeof MATURITY_ORDER)[number];

interface MaturitySummaryStrings {
  title: string;
  subtitle: string;
  componentCountLabel: string;
  canonical: string;
  stable: string;
  beta: string;
  experimental: string;
  canonicalDescription: string;
  stableDescription: string;
  betaDescription: string;
  experimentalDescription: string;
  canonicalRailTitle: string;
}

interface RegistryMaturitySummaryProps {
  items: RegistryCardItem[];
  lang: string;
  strings: MaturitySummaryStrings;
}

const DESCRIPTION_KEYS = {
  canonical: "canonicalDescription",
  stable: "stableDescription",
  beta: "betaDescription",
  experimental: "experimentalDescription",
} as const satisfies Record<RegistryMaturity, keyof MaturitySummaryStrings>;

export function RegistryMaturitySummary({ items, lang, strings }: RegistryMaturitySummaryProps) {
  const counts = countByMaturity(items);
  const canonicalItems = items.filter((item) => item.maturity === "canonical").slice(0, 8);

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_0.72fr]">
      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-5">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="font-semibold text-foreground text-sm">{strings.title}</h2>
          <p className="text-muted-foreground text-sm">{strings.subtitle}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {MATURITY_ORDER.map((maturity) => (
            <div
              key={maturity}
              className="rounded-[var(--radius-md)] border border-border bg-muted p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground text-xs uppercase tracking-wide">
                  {strings[maturity]}
                </span>
                <span className="font-mono text-muted-foreground text-xs">
                  {counts[maturity]} {strings.componentCountLabel}
                </span>
              </div>
              <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
                {strings[DESCRIPTION_KEYS[maturity]]}
              </p>
            </div>
          ))}
        </div>
      </div>

      <aside className="rounded-[var(--radius-lg)] border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground text-sm">{strings.canonicalRailTitle}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {canonicalItems.map((item) => (
            <Link
              key={item.name}
              href={`/${lang}/registry/${item.name}`}
              className="rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 font-medium text-primary text-xs transition-colors hover:bg-primary/10"
            >
              {item.title ?? item.name}
            </Link>
          ))}
        </div>
      </aside>
    </section>
  );
}

function countByMaturity(items: RegistryCardItem[]): Record<RegistryMaturity, number> {
  const counts = {
    canonical: 0,
    stable: 0,
    beta: 0,
    experimental: 0,
  } satisfies Record<RegistryMaturity, number>;

  for (const item of items) {
    if (!item.maturity) continue;
    counts[item.maturity] += 1;
  }

  return counts;
}
