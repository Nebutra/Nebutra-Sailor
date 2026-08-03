"use client";

import { CreditCard, Servers as Server, Lightning as Zap } from "@nebutra/icons";
import { KineticCodePreview, KineticFeatureCard } from "@nebutra/ui/patterns";
import { AuroraBackground } from "@nebutra/ui/primitives";
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
    "  provider: env.AI_PROVIDER,",
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
const featurePreviewMeta = [
  { filename: "tenant-isolation.sql", language: "sql" },
  { filename: "ai-provider.ts", language: "ts" },
  { filename: "plans.config.ts", language: "ts" },
] as const;

export function FeatureCards() {
  const t = useTranslations("features");

  const features = ([0, 1, 2] as const).map((i) => ({
    id: featurePreviewMeta[i].filename,
    icon: featureIcons[i],
    preview: featurePreviewMeta[i],
    title: t(`item${i}.title`),
    description: t(`item${i}.description`),
    code: featureCodes[i],
  }));

  return (
    <section id="features" className="w-full bg-muted/20 py-24 md:py-32 relative overflow-hidden">
      {/* Decorative background glows */}
      <AuroraBackground variant="subtle" />

      <div className="feature-cards-cq relative z-10 mx-auto w-full min-w-0 max-w-[1400px] px-4 sm:px-6 md:px-12">
        <AnimateIn preset="emerge" inView className="w-full min-w-0">
          <div className="mb-12 flex w-full justify-center md:mb-16">
            <h2
              className="w-full max-w-3xl text-balance text-center text-3xl font-semibold leading-tight text-foreground sm:text-4xl md:text-5xl"
              style={{ letterSpacing: "var(--tracking-heading)" }}
            >
              {t("sectionTitle")}
            </h2>
          </div>
        </AnimateIn>

        <AnimateInGroup
          inView
          stagger="normal"
          className="feature-cards-grid grid w-full min-w-0 grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3"
        >
          {features.map((feature, idx) => {
            return (
              <AnimateIn key={feature.id} preset="fadeUp" className="h-full">
                <KineticFeatureCard
                  eyebrow={`signal 0${idx + 1}`}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                >
                  <KineticCodePreview
                    filename={feature.preview.filename}
                    language={feature.preview.language}
                    lines={feature.code}
                  />
                </KineticFeatureCard>
              </AnimateIn>
            );
          })}
        </AnimateInGroup>
      </div>
    </section>
  );
}

FeatureCards.displayName = "FeatureCards";
