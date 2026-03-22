"use client";

import { CreditCard, Server, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";

const featureCodes = [
  [
    "-- Every query scoped to org",
    "ALTER TABLE resources ENABLE ROW LEVEL SECURITY;",
    "",
    "CREATE POLICY tenant_isolation ON resources",
    "  USING (org_id = current_setting('app.org_id')::uuid);",
  ],
  [
    "// One interface, any provider",
    "const ai = createAI({",
    "  provider: env.AI_PROVIDER,  // 'openai' | 'anthropic'",
    "  model: env.AI_MODEL,",
    "});",
    "",
    "const result = await ai.complete(prompt);",
  ],
  [
    "// Protect routes by plan",
    "export const config = {",
    "  plans: {",
    "    starter: { seats: 5, api: 10_000 },",
    "    pro: { seats: 25, api: 100_000 },",
    "  },",
    "};",
  ],
] as const;

const featureIcons = [Server, Zap, CreditCard] as const;

/**
 * FeatureCards - Capability cards with code previews.
 */
export function FeatureCards() {
  const t = useTranslations("features");

  const features = ([0, 1, 2] as const).map((i) => ({
    icon: featureIcons[i],
    title: t(`item${i}.title`),
    description: t(`item${i}.description`),
    code: featureCodes[i],
  }));

  return (
    <section id="features" className="w-full bg-neutral-2 py-24 md:py-32 dark:bg-black">
      <div className="feature-cards-cq mx-auto max-w-6xl px-6">
        <AnimateIn preset="emerge" inView>
          <h2 className="mb-16 text-center text-3xl font-bold tracking-tight text-neutral-12 md:text-4xl dark:text-white">
            {t("sectionTitle")}
          </h2>
        </AnimateIn>

        <AnimateInGroup
          inView
          stagger="normal"
          className="feature-cards-grid grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <AnimateIn key={feature.title} preset="fadeUp" className="h-full">
                <article className="feature-card-cq group flex h-full flex-col rounded-2xl border border-neutral-7 bg-neutral-1 p-6 transition-all hover:border-blue-7 hover:shadow-brand dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20">
                  <Icon className="mb-4 h-5 w-5 text-blue-10 dark:text-cyan-9" />
                  <h3 className="feature-card-title mb-2 font-semibold text-neutral-12 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="feature-card-description mb-6 text-sm leading-relaxed text-neutral-11 dark:text-white/70">
                    {feature.description}
                  </p>

                  <div className="feature-card-code mt-auto min-w-0 rounded-xl border border-neutral-7 bg-neutral-2 p-4 dark:border-white/10 dark:bg-black/40">
                    <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-neutral-11 dark:text-white/75">
                      {feature.code.map((line, j) => (
                        <span key={j} className="block">
                          {line || "\u00a0"}
                        </span>
                      ))}
                    </pre>
                  </div>
                </article>
              </AnimateIn>
            );
          })}
        </AnimateInGroup>
      </div>
    </section>
  );
}

FeatureCards.displayName = "FeatureCards";
