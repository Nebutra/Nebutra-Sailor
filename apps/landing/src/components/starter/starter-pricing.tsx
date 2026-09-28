"use client";

import { Check } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Button, ToggleGroup, ToggleGroupItem } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { useState } from "react";
import { type Currency, type Plan, SITE } from "@/content/site";
import { isZhUiLocale } from "@/lib/i18n/localized";
import { SectionHeading } from "./section-heading";
import { say } from "./starter-copy";
import { StarterLink } from "./starter-link";

type Period = "monthly" | "yearly";

function formatPrice(amount: number, currency: Currency, locale: string): string {
  return new Intl.NumberFormat(currency === "CNY" ? "zh-CN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/^CN¥/, isZhUiLocale(locale) ? "¥" : "CN¥");
}

/**
 * Plans from src/content/site.ts, with a monthly / yearly switch. Chinese pages
 * show CNY, every other language USD.
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
  const [period, setPeriod] = useState<Period>("monthly");
  const currency: Currency = isZhUiLocale(locale) ? "CNY" : "USD";

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="scroll-mt-20 px-4 py-20 md:px-6 md:py-28"
    >
      <div className="mx-auto max-w-content">
        <SectionHeading
          id="pricing-title"
          level={level}
          eyebrow={say(pricing.eyebrow, locale)}
          title={say(pricing.title, locale)}
          lead={say(pricing.lead, locale)}
        />

        <div className="mt-10 flex justify-center">
          <ToggleGroup
            type="single"
            className="rounded-full"
            value={period}
            onValueChange={(value) => {
              if (value === "monthly" || value === "yearly") setPeriod(value);
            }}
            aria-label={`${say(pricing.monthly, locale)} / ${say(pricing.yearly, locale)}`}
          >
            {(["monthly", "yearly"] as const).map((value) => (
              <ToggleGroupItem key={value} value={value} className="rounded-full px-4">
                {say(pricing[value], locale)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <AnimateInGroup stagger="fast" className="mt-10 grid gap-4 lg:grid-cols-3">
          {pricing.plans.map((plan) => (
            <AnimateIn key={plan.id} preset="fadeUp" className="h-full">
              <PlanCard plan={plan} period={period} currency={currency} locale={locale} />
            </AnimateIn>
          ))}
        </AnimateInGroup>
      </div>
    </section>
  );
}

function PlanCard({
  plan,
  period,
  currency,
  locale,
}: {
  plan: Plan;
  period: Period;
  currency: Currency;
  locale: string;
}) {
  const price = plan.price[period];
  const highlighted = Boolean(plan.highlight);
  return (
    <article
      aria-labelledby={`plan-${plan.id}`}
      data-plan={plan.id}
      className={cn(
        "flex h-full flex-col rounded-[var(--radius-xl)] bg-card p-6 md:p-8",
        highlighted
          ? "shadow-ambient-lg ring-2 ring-foreground"
          : "shadow-ambient-sm ring-1 ring-border",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 id={`plan-${plan.id}`} className="text-base font-semibold text-foreground">
          {say(plan.name, locale)}
        </h3>
        {plan.highlight ? (
          <span className="rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-background">
            {say(plan.highlight, locale)}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{say(plan.blurb, locale)}</p>
      <p className="mt-6 flex items-baseline gap-2">
        <span className="text-4xl font-semibold tracking-tight text-foreground tabular-nums">
          {price
            ? formatPrice(price[currency], currency, locale)
            : say(SITE.pricing.onRequest, locale)}
        </span>
        <span className="text-sm text-muted-foreground">{say(plan.unit, locale)}</span>
      </p>
      <Button asChild className="mt-6 w-full" variant={highlighted ? "ink" : "outline"}>
        <StarterLink href={plan.cta.href}>{say(plan.cta.label, locale)}</StarterLink>
      </Button>
      <ul className="mt-8 space-y-3 border-t border-border pt-6 text-sm">
        {plan.features.map((feature) => (
          <li key={feature.en} className="flex items-start gap-2.5 text-foreground/85">
            <Check size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground" />
            {say(feature, locale)}
          </li>
        ))}
      </ul>
    </article>
  );
}
