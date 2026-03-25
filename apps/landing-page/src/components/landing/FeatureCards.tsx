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

export function FeatureCards() {
  const t = useTranslations("features");

  const features = ([0, 1, 2] as const).map((i) => ({
    icon: featureIcons[i],
    title: t(`item${i}.title`),
    description: t(`item${i}.description`),
    code: featureCodes[i],
  }));

  return (
    <section id="features" className="w-full bg-muted/20 py-24 md:py-32 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="feature-cards-cq mx-auto max-w-[1400px] px-6 md:px-12 relative z-10">
        <AnimateIn preset="emerge" inView>
          <div className="flex justify-center mb-16">
            <h2 className="text-center text-4xl md:text-5xl font-black tracking-tight text-foreground max-w-3xl text-balance leading-tight">
              {t("sectionTitle")}
            </h2>
          </div>
        </AnimateIn>

        <AnimateInGroup
          inView
          stagger="normal"
          className="feature-cards-grid grid grid-cols-1 gap-8 lg:grid-cols-3"
        >
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <AnimateIn key={idx} preset="fadeUp" className="h-full">
                <article className="group flex h-full flex-col rounded-[2.5rem] border border-border/40 bg-background/60 dark:bg-background/40 backdrop-blur-2xl p-8 md:p-10 transition-all duration-500 hover:shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:border-primary/20 hover:-translate-y-1">
                  <div className="h-14 w-14 rounded-2xl bg-primary/5 dark:bg-primary/10 flex items-center justify-center mb-8 ring-1 ring-primary/20 shadow-inner">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="mb-4 text-2xl font-bold text-foreground tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="mb-10 text-lg leading-relaxed text-muted-foreground font-medium">
                    {feature.description}
                  </p>

                  <div className="mt-auto pt-4 relative">
                    {/* Faux Terminal Editor */}
                    <div className="overflow-hidden rounded-2xl border border-border/50 bg-muted/30 dark:bg-zinc-950/60 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                      {/* Window Controls */}
                      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/50 dark:bg-zinc-900/40">
                        <div className="w-3 h-3 rounded-full bg-border/80 dark:bg-zinc-700/80"></div>
                        <div className="w-3 h-3 rounded-full bg-border/80 dark:bg-zinc-700/80"></div>
                        <div className="w-3 h-3 rounded-full bg-border/80 dark:bg-zinc-700/80"></div>
                      </div>
                      {/* Code Area */}
                      <div className="px-5 py-4">
                        <pre className="overflow-x-auto font-mono text-[13px] sm:text-sm leading-relaxed text-foreground/80 dark:text-zinc-300">
                          {feature.code.map((line, j) => {
                            const isComment =
                              line.trim().startsWith("//") || line.trim().startsWith("--");
                            const isKeyword =
                              line.includes("export") ||
                              line.includes("const") ||
                              line.includes("await") ||
                              line.includes("ALTER") ||
                              line.includes("CREATE");
                            const isObjKey = line.includes(":") && !isComment;

                            return (
                              <span
                                key={j}
                                className={`block ${isComment ? "text-muted-foreground/50 italic" : isKeyword ? "text-blue-600 dark:text-blue-400 font-medium" : isObjKey ? "text-emerald-600 dark:text-emerald-400" : "text-foreground/80 dark:text-zinc-300"}`}
                              >
                                {line || "\u00a0"}
                              </span>
                            );
                          })}
                        </pre>
                      </div>
                    </div>
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
