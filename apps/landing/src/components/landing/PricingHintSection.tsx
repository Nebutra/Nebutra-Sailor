import { AnimateIn, AnimateInGroup } from "./AnimateIn";

export function PricingHintSection() {
  return (
    <section id="pricing" className="w-full bg-background py-24 md:py-32 dark:bg-black">
      <div className="mx-auto max-w-6xl px-6">
        <AnimateIn inView preset="emerge">
          <div className="rounded-[var(--radius-3xl)] border border-border bg-muted p-8 md:p-12">
            <div className="grid gap-8 md:grid-cols-2 md:items-end">
              <div>
                <p className="text-sm font-semibold tracking-[0.14em] text-[color:var(--blue-11)] uppercase">
                  Plans built for teams
                </p>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  Start free. Upgrade when your usage demands it.
                </h2>
                <p className="mt-4 text-base text-muted-foreground">
                  The same platform baseline supports individual builders, product teams, and
                  enterprise delivery.
                </p>
              </div>
              <AnimateInGroup inView stagger="fast" className="grid gap-3 text-sm text-foreground">
                <AnimateIn preset="fadeUp">
                  <p className="rounded-[var(--radius-xl)] border border-border bg-background px-4 py-3 dark:bg-black/30">
                    Baseline: tenant isolation, auth, and platform scaffolding
                  </p>
                </AnimateIn>
                <AnimateIn preset="fadeUp">
                  <p className="rounded-[var(--radius-xl)] border border-border bg-background px-4 py-3 dark:bg-black/30">
                    Growth: usage billing, runtime integrations, and automation
                  </p>
                </AnimateIn>
                <AnimateIn preset="fadeUp">
                  <p className="rounded-[var(--radius-xl)] border border-border bg-background px-4 py-3 dark:bg-black/30">
                    Enterprise: SSO, audit controls, and governed delivery
                  </p>
                </AnimateIn>
              </AnimateInGroup>
            </div>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}

PricingHintSection.displayName = "PricingHintSection";
