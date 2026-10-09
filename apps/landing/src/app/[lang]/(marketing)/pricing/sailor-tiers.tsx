import { brand } from "@nebutra/brand/metadata";
import { CheckCircle } from "@nebutra/icons";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createAppSignUpUrl, getStartedHref } from "@/lib/app-url";

const TIERS = [
  { key: "community", features: ["f1", "f2", "f3", "f4", "f5"] },
  { key: "team", features: ["f1", "f2", "f3", "f4", "f5"], highlighted: true },
  { key: "enterprise", features: ["f1", "f2", "f3", "f4", "f5", "f6"] },
] as const;

/** The three Sailor licence tiers, read from the same strings as LICENSE-COMMERCIAL.md §2. */
export async function SailorTiers({ lang }: { lang: string }) {
  const t = await getTranslations({ locale: lang, namespace: "microLanding.pricing" });
  type Key = Parameters<typeof t>[0];
  const href = {
    community: getStartedHref(),
    team: createAppSignUpUrl("/choose-plan"),
    enterprise: "/contact",
  } as const;

  return (
    <div className="mt-12 grid gap-4 lg:grid-cols-3">
      {TIERS.map((tier) => {
        const highlighted = "highlighted" in tier;
        const cta = t(`${tier.key}.cta` as Key, { brandName: brand.name });
        const ctaClass = highlighted
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border border-border bg-background text-foreground hover:bg-accent";
        const link = href[tier.key];
        return (
          <article
            key={tier.key}
            className="relative flex flex-col overflow-hidden rounded-xl border border-border bg-card p-6 shadow-ambient-sm sm:p-8"
          >
            {highlighted ? (
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-px"
                style={{ background: "var(--brand-gradient)" }}
              />
            ) : null}
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {t(`${tier.key}.badge` as Key)}
            </p>
            <p className="mt-4 flex items-baseline gap-2 tabular-nums">
              <span className="font-heading text-4xl tracking-tight text-foreground">
                {t(`${tier.key}.price` as Key)}
              </span>
              <span className="text-sm text-muted-foreground">
                {t(`${tier.key}.period` as Key)}
              </span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t(`${tier.key}.desc` as Key)}
            </p>
            <ul className="mt-6 space-y-3 border-t border-border pt-6 text-sm text-foreground">
              {tier.features.map((f) => (
                <li key={f} className="flex gap-3">
                  <CheckCircle
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span>{t(`${tier.key}.${f}` as Key)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-8">
              {link.startsWith("/") && !link.startsWith("//") ? (
                <Link
                  href={link}
                  className={`inline-flex h-10 w-full items-center justify-center rounded-md px-4 text-sm font-medium transition-colors duration-micro ${ctaClass}`}
                >
                  {cta}
                </Link>
              ) : (
                <a
                  href={link}
                  className={`inline-flex h-10 w-full items-center justify-center rounded-md px-4 text-sm font-medium transition-colors duration-micro ${ctaClass}`}
                >
                  {cta}
                </a>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
