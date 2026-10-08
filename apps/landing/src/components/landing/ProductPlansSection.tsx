import { DEFAULT_PRICING, getCreditAllowanceForPlan } from "@nebutra/billing";
import { CheckCircle } from "@nebutra/icons";
import { Badge, Button, Card } from "@nebutra/ui/primitives";
import { createAppSignUpUrl } from "@/lib/app-url";

/** Public SaaS plans; prices and allowances come from the billing catalog. */
export function ProductPlansSection() {
  const plans = [
    {
      ...DEFAULT_PRICING[0],
      allowance: getCreditAllowanceForPlan("FREE"),
      cta: "Start free",
      href: createAppSignUpUrl("/choose-plan"),
    },
    {
      ...DEFAULT_PRICING[1],
      allowance: getCreditAllowanceForPlan("PRO"),
      cta: "Choose Pro",
      href: createAppSignUpUrl("/choose-plan"),
    },
    {
      ...DEFAULT_PRICING[3],
      allowance: getCreditAllowanceForPlan("ENTERPRISE"),
      cta: "Contact sales",
      href: "/contact",
    },
  ];
  return (
    <section aria-labelledby="product-plans-heading" className="mt-24 border-t border-border pt-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 id="product-plans-heading" className="text-3xl font-bold text-foreground">
          Nebutra plans and credits
        </h2>
        <p className="mt-3 text-muted-foreground">
          Use Nebutra with a free allowance, or add a paid plan for more monthly credits and team
          capacity.
        </p>
      </div>
      <div className="mx-auto mt-10 grid max-w-[1200px] gap-8 md:grid-cols-3">
        {plans.map((plan) => {
          const price = plan.contactSales
            ? "Custom"
            : plan.amount === 0
              ? "$0"
              : `$${plan.amount / 100}`;
          const credits =
            plan.allowance.includedMonthly < 0
              ? "Unlimited monthly credits"
              : `${plan.allowance.includedMonthly.toLocaleString()} monthly credits`;
          return (
            <Card key={plan.id} className="flex flex-col p-8">
              <Badge variant={plan.plan === "PRO" ? "default" : "outline"} className="w-fit">
                {plan.name}
              </Badge>
              <div className="mt-6 text-4xl font-semibold">
                {price}
                {!plan.contactSales && (
                  <span className="text-base font-medium text-muted-foreground"> / month</span>
                )}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{credits}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {plan.features.slice(0, 4).map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-8 w-full"
                variant={plan.plan === "PRO" ? "ink" : "outline"}
                asChild
              >
                <a href={plan.href}>{plan.cta}</a>
              </Button>
            </Card>
          );
        })}
      </div>
      <p className="mx-auto mt-6 max-w-3xl text-center text-xs text-muted-foreground">
        Prices are in USD. Credit balances and entitlements are applied by the Nebutra billing
        ledger.
      </p>
    </section>
  );
}
