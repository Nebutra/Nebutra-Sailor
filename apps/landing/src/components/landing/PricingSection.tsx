import { CheckCircle } from "@nebutra/icons";
import { AuroraBackground, Badge, Button, Card } from "@nebutra/ui/primitives";
import { getTranslations } from "next-intl/server";
import { createAppSignUpUrl } from "@/lib/app-url";

/**
 * All three tiers read their price from the catalog strings, which mirror
 * LICENSE-COMMERCIAL.md §2 (Team is a fixed USD 2,000 / year) — update both
 * together. Team used to be the only tier converted live through the visitor's
 * geo-IP currency and a fetched FX rate, which put "¥318,178" next to two USD
 * tiers for anyone whose IP resolved outside the US.
 */
export async function PricingSection({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const t = await getTranslations("microLanding.pricing");
  type PricingTranslationKey = Parameters<typeof t>[0];

  const TIERS = [
    {
      key: "community",
      ctaHref: "/get-license",
      highlighted: false,
      featureKeys: ["f1", "f2", "f3", "f4", "f5"] as const,
      dynamicPrice: t("community.price"), // "Free"
    },
    {
      key: "team",
      ctaHref: createAppSignUpUrl("/choose-plan"),
      highlighted: true,
      featureKeys: ["f1", "f2", "f3", "f4", "f5"] as const,
      dynamicPrice: t("team.price"), // "$2,000"
    },
    {
      key: "enterprise",
      ctaHref: "/contact",
      highlighted: false,
      featureKeys: ["f1", "f2", "f3", "f4", "f5", "f6"] as const,
      // Localised "From $30,000" — a floor, not a converted line item.
      dynamicPrice: t("enterprise.price"),
    },
  ] as const;

  return (
    <section className="py-24 md:py-32 bg-background relative overflow-hidden">
      <AuroraBackground variant="subtle" position="center" intensity={0.4} />

      <div className="container relative mx-auto px-4 max-w-[1400px]">
        {!hideHeader && (
          <div className="text-center mb-16 md:mb-24">
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-6"
              style={{
                letterSpacing: "var(--tracking-heading)",
                lineHeight: "var(--leading-heading)",
              }}
            >
              {t("title")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto text-balance">
              {t("description")}
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8 max-w-[1200px] mx-auto items-stretch">
          {TIERS.map((tier) => (
            <Card
              key={tier.key}
              className={[
                "p-8 relative flex flex-col overflow-hidden rounded-[var(--radius-panel)] transition-transform duration-150 hover:-translate-y-px",
                tier.highlighted
                  ? "border border-[hsl(var(--primary))]/40 bg-background/80 lg:-translate-y-2 z-10"
                  : "border border-border bg-background/50",
              ].join(" ")}
              style={{ boxShadow: "var(--ring-hairline)" }}
            >
              {tier.highlighted && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
              )}

              <Badge
                className={[
                  "mb-6 w-fit",
                  tier.highlighted
                    ? "bg-primary text-primary-foreground border-none"
                    : "bg-muted text-muted-foreground border-border",
                ].join(" ")}
                variant={tier.highlighted ? "default" : "outline"}
              >
                {t(`${tier.key}.badge` as PricingTranslationKey)}
              </Badge>

              {/* The price sets its own size. "From $30,000" at text-5xl is wider
                  than a third-width card, so it wrapped between the prefix and the
                  figure and left the unit stacked in a column of its own. A longer
                  string takes the next size down instead of breaking. */}
              <div className="mb-6 flex flex-wrap items-baseline gap-x-2">
                <span
                  className={[
                    "whitespace-nowrap font-semibold",
                    tier.dynamicPrice.length > 8 ? "text-3xl md:text-4xl" : "text-4xl md:text-5xl",
                  ].join(" ")}
                  style={{ letterSpacing: "var(--tracking-heading)" }}
                >
                  {tier.dynamicPrice}
                </span>
                <span className="whitespace-nowrap font-medium text-muted-foreground">
                  / {t(`${tier.key}.period` as PricingTranslationKey)}
                </span>
              </div>

              <p className="text-muted-foreground text-sm mb-6 leading-relaxed min-h-[40px]">
                {t(`${tier.key}.desc` as PricingTranslationKey)}
              </p>

              <div className="space-y-3 flex-grow mb-8">
                {tier.featureKeys.map((fKey) => (
                  <div key={`${tier.key}-${fKey}`} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium">
                      {t(`${tier.key}.${fKey}` as PricingTranslationKey)}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                className="w-full h-12 text-base font-semibold rounded-[var(--radius-button)]"
                variant={tier.highlighted ? "ink" : "outline"}
                asChild
              >
                <a href={tier.ctaHref}>{t(`${tier.key}.cta` as PricingTranslationKey)}</a>
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
