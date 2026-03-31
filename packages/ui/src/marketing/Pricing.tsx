"use client";

import { cva } from "class-variance-authority";
import { Check, X } from "lucide-react";
import * as React from "react";
import { AnimateIn, AnimateInGroup } from "../primitives/animate-in";
import { cn } from "../utils/cn";
import type { PricingProps } from "./types";

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
  "relative flex flex-col p-8 rounded-3xl border transition-all h-full bg-[var(--neutral-1)]",
  {
    variants: {
      popular: {
        true: "border-[var(--brand-gradient-start,var(--blue-9))] shadow-xl shadow-[var(--blue-11)]/5 ring-1 ring-[var(--blue-9)] md:scale-105 z-10",
        false: "border-[var(--neutral-6)] hover:border-[var(--neutral-7)]",
      },
    },
    defaultVariants: {
      popular: false,
    },
  },
);

export function Pricing({
  locale = "en",
  plans = [],
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

  const formatPrice = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <section id={id} className={cn(pricingVariants({ density }), className)}>
      <AnimateIn preset="fadeUp">
        <div className="flex flex-col items-center text-center space-y-4 mb-12">
          {title && (
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-[var(--neutral-12)]">
              {title}
            </h2>
          )}
          {subtitle && <p className="text-lg text-[var(--neutral-11)] max-w-2xl">{subtitle}</p>}
        </div>
      </AnimateIn>

      {showBillingToggle && (
        <AnimateIn preset="fadeUp" delay={0.1}>
          <div className="flex justify-center mb-16">
            <div className="relative flex items-center p-1 bg-[var(--neutral-3)] rounded-full border border-[var(--neutral-6)]">
              <button
                type="button"
                className={cn(
                  "relative w-32 py-2 text-sm font-medium rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neutral-7)] z-10",
                  billingCycle === "monthly"
                    ? "text-[var(--neutral-12)] bg-[var(--neutral-1)] shadow-sm"
                    : "text-[var(--neutral-11)] hover:text-[var(--neutral-12)]",
                )}
                onClick={() => setBillingCycle("monthly")}
              >
                Monthly
              </button>
              <button
                type="button"
                className={cn(
                  "relative w-32 py-2 text-sm font-medium rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neutral-7)] z-10",
                  billingCycle === "yearly"
                    ? "text-[var(--neutral-12)] bg-[var(--neutral-1)] shadow-sm"
                    : "text-[var(--neutral-11)] hover:text-[var(--neutral-12)]",
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
          {plans.map((plan, index) => (
            <AnimateIn key={plan.id} preset="fadeUp">
              <div
                className={cn(cardVariants({ popular: plan.popular }))}
                data-popular={plan.popular}
              >
                {/* Popular Gradient Glow Background (Optional) */}
                {plan.popular && (
                  <div className="absolute inset-0 bg-gradient-to-b from-[var(--blue-9)]/5 to-transparent rounded-3xl pointer-events-none" />
                )}

                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-semibold text-[var(--neutral-12)]">{plan.name}</h3>
                    {plan.badge && (
                      <span className="px-3 py-1 text-xs font-semibold text-[var(--blue-11)] bg-[var(--blue-3)] rounded-full">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-[var(--neutral-11)] min-h-[40px] mb-6">
                    {plan.description}
                  </p>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold tracking-tight text-[var(--neutral-12)]">
                      {formatPrice(
                        billingCycle === "monthly" ? plan.price.monthly : plan.price.yearly / 12,
                        plan.price.currency,
                      )}
                    </span>
                    <span className="text-sm font-medium text-[var(--neutral-11)]">/month</span>
                  </div>

                  {billingCycle === "yearly" ? (
                    <div className="text-sm text-[var(--neutral-10)] mb-8 h-5">
                      Billed {formatPrice(plan.price.yearly, plan.price.currency)}/year
                    </div>
                  ) : (
                    <div className="mb-8 h-5" aria-hidden="true" />
                  )}

                  <a
                    href={plan.cta.href}
                    data-analytics={`pricing-cta-${plan.id}`}
                    className={cn(
                      "w-full inline-flex justify-center items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--neutral-12)] mb-8",
                      plan.popular
                        ? "bg-[var(--neutral-12)] text-[var(--neutral-1)] hover:bg-[var(--neutral-11)] shadow-md hover:shadow-lg"
                        : "bg-[var(--neutral-3)] text-[var(--neutral-12)] hover:bg-[var(--neutral-4)] border border-[var(--neutral-6)]",
                    )}
                  >
                    {plan.cta.text}
                  </a>

                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--neutral-12)] mb-4">
                      {plan.features.some((f) => f.included)
                        ? "Features included:"
                        : "What's included"}
                    </p>
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
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
                                ? "text-[var(--neutral-11)]"
                                : "text-[var(--neutral-9)] line-through",
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
              <h3 className="text-2xl font-bold tracking-tight text-[var(--neutral-12)]">
                Compare plans
              </h3>
            </div>
          </AnimateIn>
          {/* Comparison table can be implemented as a separate component */}
          <div className="max-w-5xl mx-auto border border-[var(--neutral-6)] rounded-2xl p-8 bg-[var(--neutral-2)] flex items-center justify-center min-h-[200px] text-[var(--neutral-10)] text-sm">
            Detailed comparison matrix coming soon.
          </div>
        </div>
      )}
    </section>
  );
}

Pricing.displayName = "Pricing";
