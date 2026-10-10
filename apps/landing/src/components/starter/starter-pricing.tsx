"use client";

import { isChineseProductLanguage } from "@nebutra/i18n/languages";
import { Check } from "@nebutra/icons";
import { Button, ToggleGroup, ToggleGroupItem } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { type Currency, type Plan, SITE, type SiteTranslator } from "@/content/site";
import { RevealGroup } from "@/shared/animation/reveal-group";
import { SectionHeading } from "./section-heading";
import { StarterLink } from "./starter-link";

type Period = "monthly" | "yearly";

function formatPrice(amount: number, currency: Currency, locale: string): string {
  return new Intl.NumberFormat(currency === "CNY" ? "zh-CN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/^CN¥/, isChineseProductLanguage(locale) ? "¥" : "CN¥");
}

/**
 * Plans from src/content/site.ts + messages/en.json → site.pricing, with a
 * monthly / yearly switch. Chinese pages show CNY, every other language USD.
 */
export function StarterPricing({
  locale,
  level = 2,
}: {
  locale: string;
  /** 1 on the pricing page, where this is the page's heading. */
  level?: 1 | 2;
}) {
  const { pricing } = SITE;
  const t = useTranslations("site.pricing") as unknown as SiteTranslator;
  const [period, setPeriod] = useState<Period>("monthly");
  const currency: Currency = isChineseProductLanguage(locale) ? "CNY" : "USD";

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="scroll-mt-20 px-4 py-16 md:px-6 md:py-28"
    >
      <div className="mx-auto max-w-content">
        <SectionHeading id="pricing-title" level={level} title={t("title")} lead={t("lead")} />

        <div className="mt-10 flex justify-center">
          <ToggleGroup
            type="single"
            className="rounded-full"
            value={period}
            onValueChange={(value) => {
              if (value === "monthly" || value === "yearly") setPeriod(value);
            }}
            aria-label={`${t("monthly")} / ${t("yearly")}`}
          >
            {(["monthly", "yearly"] as const).map((value) => (
              <ToggleGroupItem key={value} value={value} className="rounded-full px-4">
                {t(value)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <RevealGroup className="mt-10 grid gap-4 lg:grid-cols-3">
          {pricing.plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              period={period}
              currency={currency}
              locale={locale}
              t={t}
            />
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

function PlanCard({
  plan,
  period,
  currency,
  locale,
  t,
}: {
  plan: Plan;
  period: Period;
  currency: Currency;
  locale: string;
  t: SiteTranslator;
}) {
  const price = plan.price[period];
  const highlighted = Boolean(plan.highlight);
  const features = t.raw(`plans.${plan.id}.features`) as string[];
  return (
    <article
      aria-labelledby={`plan-${plan.id}`}
      data-plan={plan.id}
      className={cn(
        // A hairline, never a hairline and a shadow; the plan to pick is the
        // one with the heavier rule.
        "flex h-full flex-col rounded-[var(--radius-xl)] bg-card p-6 md:p-8",
        highlighted ? "ring-2 ring-foreground" : "ring-1 ring-border",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 id={`plan-${plan.id}`} className="text-base font-medium text-foreground">
          {t(`plans.${plan.id}.name`)}
        </h3>
        {plan.highlight ? (
          <span className="rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-background">
            {t(`plans.${plan.id}.highlightLabel`)}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{t(`plans.${plan.id}.blurb`)}</p>
      <p className="mt-6 flex items-baseline gap-2">
        <span className="font-heading text-4xl font-medium tracking-tight text-foreground tabular-nums">
          {price ? formatPrice(price[currency], currency, locale) : t("onRequest")}
        </span>
        <span className="text-sm text-muted-foreground">{t(`plans.${plan.id}.unit`)}</span>
      </p>
      <Button asChild className="mt-6 w-full" variant={highlighted ? "ink" : "outline"}>
        <StarterLink href={plan.cta.href}>{t(`plans.${plan.id}.ctaLabel`)}</StarterLink>
      </Button>
      <ul className="mt-8 space-y-3 border-t border-border pt-6 text-sm">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2.5 text-foreground/85">
            <Check size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground" />
            {feature}
          </li>
        ))}
      </ul>
    </article>
  );
}
