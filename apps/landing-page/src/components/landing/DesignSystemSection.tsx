"use client";

import { AnimateIn, AnimateInGroup } from "./AnimateIn";
import { ColorScaleCard } from "./design-system/ColorScaleCard";
import { InteractiveDocsCard } from "./design-system/InteractiveDocsCard";
import { PipelineGraph } from "./design-system/PipelineGraph";
import { ThemeSelectorCard } from "./design-system/ThemeSelectorCard";
import { TokenGovernanceCard } from "./design-system/TokenGovernanceCard";
import { VrtCard } from "./design-system/VrtCard";

export function DesignSystemSection() {
  return (
    <section className="w-full bg-muted/20 py-24 md:py-32 relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-[1400px] px-4 md:px-6 relative z-10">
        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Top/Middle Section */}
          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column Component */}
            <AnimateIn
              preset="fadeUp"
              inView
              className="order-2 md:order-1 h-[400px] xl:h-[450px] rounded-3xl border border-border/50 bg-background/50 dark:bg-zinc-950/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
            >
              <ColorScaleCard />
            </AnimateIn>

            {/* Center Presentation Pipeline */}
            <div className="order-1 md:order-2 flex flex-col justify-end text-center items-center pb-2 xl:pb-12">
              <PipelineGraph />
            </div>

            {/* Right Column Component */}
            <AnimateIn
              preset="fadeUp"
              inView
              className="order-3 md:order-3 h-[400px] xl:h-[450px] rounded-3xl border border-border/50 bg-background/50 dark:bg-zinc-950/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
            >
              <InteractiveDocsCard />
            </AnimateIn>
          </div>

          {/* Bottom Row */}
          <AnimateInGroup
            inView
            stagger="normal"
            className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              { component: <VrtCard />, key: "vrt" },
              { component: <TokenGovernanceCard />, key: "token" },
              { component: <ThemeSelectorCard />, key: "theme" },
            ].map((item) => (
              <AnimateIn key={item.key} preset="fadeUp" inView>
                <div className="h-[320px] rounded-3xl border border-border/50 bg-background/50 dark:bg-zinc-950/40 backdrop-blur-xl transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:border-primary/30 group">
                  {item.component}
                </div>
              </AnimateIn>
            ))}
          </AnimateInGroup>
        </div>
      </div>
    </section>
  );
}

DesignSystemSection.displayName = "DesignSystemSection";
