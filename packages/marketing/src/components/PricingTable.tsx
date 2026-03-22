import React from "react";

export interface PricingPlan {
  name: string;
  price: string;
  description: string;
  features: string[];
  ctaText: string;
  ctaUrl: string;
  isPopular?: boolean;
}

export interface PricingTableProps {
  title?: string;
  description?: string;
  plans: PricingPlan[];
}

export function PricingTable({
  title = "Simple, transparent pricing",
  description = "No hidden fees. No surprises. Cancel anytime.",
  plans,
}: PricingTableProps) {
  return (
    <div className="mx-auto max-w-7xl font-sans">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-xl text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>

      <div className="mt-16 grid gap-8 lg:grid-cols-3 lg:gap-12">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative flex flex-col rounded-2xl border p-8 shadow-sm ${
              plan.isPopular
                ? "border-blue-600 bg-blue-50/50 shadow-xl ring-1 ring-blue-600 dark:bg-blue-900/10"
                : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            }`}
          >
            {plan.isPopular && (
              <div className="absolute -top-4 left-0 right-0 mx-auto w-32 rounded-full bg-blue-600 px-3 py-1 text-center text-sm font-semibold tracking-wide text-white shadow-sm">
                Most Popular
              </div>
            )}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>
            </div>

            <div className="mb-6 flex items-baseline text-5xl font-extrabold text-slate-900 dark:text-white">
              {plan.price}
              {plan.price !== "Custom" && plan.price !== "Free" && (
                <span className="ml-1 text-xl font-medium text-slate-500 dark:text-slate-400">
                  /mo
                </span>
              )}
            </div>

            <ul className="mb-8 flex-1 space-y-4">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start">
                  <svg
                    className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="ml-3 text-sm text-slate-700 dark:text-slate-300">{feature}</span>
                </li>
              ))}
            </ul>

            <a
              href={plan.ctaUrl}
              className={`block w-full rounded-lg px-6 py-3 text-center text-sm font-semibold transition-colors ${
                plan.isPopular
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20"
                  : "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
              }`}
            >
              {plan.ctaText}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
