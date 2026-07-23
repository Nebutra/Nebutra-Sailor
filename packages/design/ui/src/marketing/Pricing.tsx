"use client";

import { Check, Cross as X } from "@nebutra/icons";
import { cva } from "class-variance-authority";
import * as React from "react";
import { AnimateIn, AnimateInGroup } from "../primitives/animate-in";
import { cn } from "../utils/cn";
import type { PricingFeature, PricingPlan, PricingProps } from "./types";

const EMPTY_PRICING_PLANS: PricingPlan[] = [];

function formatPrice(locale: string, amount: number, currency = "USD") {
  return amount.toLocaleString(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getPricingFeatureKey(planId: string, feature: PricingFeature) {
  return `${planId}-${feature.included ? "included" : "excluded"}-${feature.text}`;
}

const pricingVariants = cva("w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", {
  variants: {
    density: {
      compact: "py-12",
      normal: "py-16 md:py-24",
      spacious: "py-24 md:py-32",
    },
  },
  defaultVariants: {
    density: "normal",
  },
});

const cardVariants = cva(
  "relative flex flex-col p-8 rounded-[var(--radius-3xl)] border transition-[background-color,border-color,box-shadow,transform] h-full bg-background",
  {
    variants: {
      popular: {
        true: "border-[hsl(var(--primary))] shadow-xl shadow-[hsl(var(--primary))]/5 ring-1 ring-[hsl(var(--primary))] md:scale-105 z-10",
        false: "border-border hover:border-border",
      },
    },
    defaultVariants: {
      popular: false,
    },
  },
);

export function Pricing({
  locale = "en",
  plans = EMPTY_PRICING_PLANS,
  defaultBillingCycle = "monthly",
  showBillingToggle = true,
  showComparison = false,
  title,
  subtitle,
  yearlyDiscount,
  className,
  id,
  density = "normal",
}: PricingProps) {
  const [billingCycle, setBillingCycle] = React.useState(defaultBillingCycle);

  return (
    <section id={id} className={cn(pricingVariants({ density }), className)}>
      <AnimateIn preset="fadeUp">
        <div className="mb-12 flex flex-col items-center gap-4 text-center">
          {title && (
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
              {title}
            </h2>
          )}
          {subtitle && <p className="text-lg text-muted-foreground max-w-2xl">{subtitle}</p>}
        </div>
      </AnimateIn>

      {showBillingToggle && (
        <AnimateIn preset="fadeUp" delay={0.1}>
          <div className="flex justify-center mb-16">
            <div className="relative flex items-center p-1 bg-muted rounded-full border border-border">
              <button
                type="button"
                className={cn(
                  "relative w-32 py-2 text-sm font-medium rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring z-10",
                  billingCycle === "monthly"
                    ? "text-foreground bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setBillingCycle("monthly")}
              >
                Monthly
              </button>
              <button
                type="button"
                className={cn(
                  "relative w-32 py-2 text-sm font-medium rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring z-10",
                  billingCycle === "yearly"
                    ? "text-foreground bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setBillingCycle("yearly")}
              >
                Yearly
              </button>
              {yearlyDiscount && (
                <div className="absolute -top-3 -right-3 px-2 py-0.5 bg-[var(--green-9)] text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm z-20 transform rotate-3">
                  Save {yearlyDiscount}%
                </div>
              )}
            </div>
          </div>
        </AnimateIn>
      )}

      <AnimateInGroup stagger="normal">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-4 xl:gap-8 items-center max-w-6xl mx-auto">
          {plans.map((plan) => (
            <AnimateIn key={plan.id} preset="fadeUp">
              <div
                className={cn(cardVariants({ popular: plan.popular }))}
                data-popular={plan.popular}
              >
                {/* Popular Gradient Glow Background (Optional) */}
                {plan.popular && (
                  <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--primary))]/5 to-transparent rounded-[var(--radius-3xl)] pointer-events-none" />
                )}

                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                    {plan.badge && (
                      <span className="px-3 py-1 text-xs font-semibold text-[hsl(var(--primary))] bg-[var(--blue-3)] rounded-full">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground min-h-[40px] mb-6">
                    {plan.description}
                  </p>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold tracking-tight text-foreground">
                      {formatPrice(
                        locale,
                        billingCycle === "monthly" ? plan.price.monthly : plan.price.yearly / 12,
                        plan.price.currency,
                      )}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">/month</span>
                  </div>

                  {billingCycle === "yearly" ? (
                    <div className="text-sm text-muted-foreground mb-8 h-5">
                      Billed {formatPrice(locale, plan.price.yearly, plan.price.currency)}/year
                    </div>
                  ) : (
                    <div className="mb-8 h-5" aria-hidden="true" />
                  )}

                  <a
                    href={plan.cta.href}
                    data-analytics={`pricing-cta-${plan.id}`}
                    className={cn(
                      "w-full inline-flex justify-center items-center px-4 py-3 text-sm font-semibold rounded-[var(--radius-xl)] transition-[background-color,box-shadow,color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--neutral-12)] mb-8",
                      plan.popular
                        ? "bg-[var(--neutral-12)] text-[var(--neutral-1)] hover:bg-[var(--neutral-11)] shadow-md hover:shadow-lg"
                        : "bg-muted text-foreground hover:bg-muted border border-border",
                    )}
                  >
                    {plan.cta.text}
                  </a>

                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground mb-4">
                      {plan.features.some((f) => f.included)
                        ? "Features included:"
                        : "What's included"}
                    </p>
                    <ul className="flex flex-col gap-3">
                      {plan.features.map((feature) => (
                        <li
                          key={getPricingFeatureKey(plan.id, feature)}
                          className="flex items-start gap-3"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {feature.included ? (
                              <Check className="w-4 h-4 text-[var(--green-10)]" />
                            ) : (
                              <X className="w-4 h-4 text-[var(--neutral-8)]" />
                            )}
                          </div>
                          <span
                            className={cn(
                              "text-sm leading-tight",
                              feature.included
                                ? "text-muted-foreground"
                                : "text-muted-foreground line-through",
                            )}
                          >
                            {feature.text}
                            {feature.tooltip && (
                              <span
                                className="ml-1 text-[var(--neutral-8)] cursor-help"
                                title={feature.tooltip}
                              >
                                ⓘ
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </AnimateIn>
          ))}
        </div>
      </AnimateInGroup>

      {showComparison && (
        <div className="mt-24">
          <AnimateIn preset="fadeUp">
            <div className="text-center mb-12">
              <h3 className="text-2xl font-bold tracking-tight text-foreground">Compare plans</h3>
            </div>
          </AnimateIn>
          {/* Comparison table can be implemented as a separate component */}
          <div className="max-w-5xl mx-auto border border-border rounded-[var(--radius-2xl)] p-8 bg-muted flex items-center justify-center min-h-[200px] text-muted-foreground text-sm">
            Detailed comparison matrix coming soon.
          </div>
        </div>
      )}
    </section>
  );
}

Pricing.displayName = "Pricing";
