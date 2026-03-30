import { CheckCircle } from "@nebutra/icons";
import { Badge, Button, Card } from "@nebutra/ui/primitives";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { getExchangeRate } from "@/lib/pricing/exchange-rates";

export async function PricingSection({
  hideHeader = false,
  currency,
}: {
  hideHeader?: boolean;
  currency?: string;
} = {}) {
  const t = await getTranslations("microLanding.pricing");
  const locale = await getLocale();

  let resolvedCurrency = currency;
  if (!resolvedCurrency) {
    const { headers } = await import("next/headers");
    const headersList = await headers();
    resolvedCurrency = headersList.get("x-user-currency") || "USD";
  }

  const exchangeRate = await getExchangeRate(resolvedCurrency);

  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: resolvedCurrency,
    maximumFractionDigits: 0,
  });

  const TIERS = [
    {
      key: "solo",
      ctaHref: "/get-license",
      highlighted: false,
      featureKeys: ["f1", "f2", "f3", "f4", "f5"] as const,
      dynamicPrice: t("solo.price"), // Usually "Free"
    },
    {
      key: "startup",
      ctaHref: "/sign-up",
      highlighted: true,
      featureKeys: ["f1", "f2", "f3", "f4", "f5"] as const,
      dynamicPrice: formatter.format(799 * exchangeRate),
    },
    {
      key: "agency",
      ctaHref: "/contact",
      highlighted: false,
      featureKeys: ["f1", "f2", "f3", "f4", "f5", "f6"] as const,
      dynamicPrice: formatter.format(1499 * exchangeRate),
    },
  ] as const;

  return (
    <section className="py-24 md:py-32 bg-background relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[400px] bg-primary/20 blur-[150px] pointer-events-none rounded-full" />

      <div className="container relative mx-auto px-4 max-w-[1400px]">
        {!hideHeader && (
          <div className="text-center mb-16 md:mb-24">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">{t("title")}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
              {t("description")}
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8 max-w-[1200px] mx-auto items-stretch">
          {TIERS.map((tier) => (
            <Card
              key={tier.key}
              className={[
                "p-8 relative flex flex-col overflow-hidden rounded-[2.5rem] transition-all hover:shadow-xl",
                tier.highlighted
                  ? "border-primary/50 bg-background/80 backdrop-blur-xl shadow-2xl shadow-primary/10 transform lg:-translate-y-2 z-10"
                  : "border-border/50 bg-background/50 backdrop-blur-md",
              ].join(" ")}
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
                {t(`${tier.key}.badge` as any)}
              </Badge>

              <div className="mb-6 flex items-baseline">
                <span className="text-4xl font-black tracking-tight">{tier.dynamicPrice}</span>
                <span className="text-muted-foreground font-medium ml-2">
                  / {t(`${tier.key}.period` as any)}
                </span>
              </div>

              <p className="text-muted-foreground text-sm mb-6 leading-relaxed min-h-[40px]">
                {t(`${tier.key}.desc` as any)}
              </p>

              <div className="space-y-3 flex-grow mb-8">
                {tier.featureKeys.map((fKey, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium">{t(`${tier.key}.${fKey}` as any)}</span>
                  </div>
                ))}
              </div>

              <Button
                className={[
                  "w-full h-12 text-base font-bold rounded-xl",
                  tier.highlighted ? "shadow-lg shadow-primary/20" : "",
                ].join(" ")}
                variant={tier.highlighted ? "default" : "secondary"}
                asChild
              >
                <a href={tier.ctaHref}>{t(`${tier.key}.cta` as any)}</a>
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
