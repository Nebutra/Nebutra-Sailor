"use client";

import { Cpu, Layers, Shield } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Card } from "@nebutra/ui/primitives";
import { Zap } from "lucide-react";
import { useTranslations } from "next-intl";

export function AgenticCapabilitiesSection() {
  const t = useTranslations("agenticCapabilities");

  const capabilities = [
    {
      icon: Shield,
      title: t("items.harness.title"),
      desc: t("items.harness.desc"),
      color: "text-blue-500",
      bgClass: "from-blue-500/10 to-transparent",
      borderClass: "group-hover:border-blue-500/30",
    },
    {
      icon: Cpu,
      title: t("items.agentic.title"),
      desc: t("items.agentic.desc"),
      color: "text-purple-500",
      bgClass: "from-purple-500/10 to-transparent",
      borderClass: "group-hover:border-purple-500/30",
    },
    {
      icon: Zap,
      title: t("items.vibe.title"),
      desc: t("items.vibe.desc"),
      color: "text-emerald-500",
      bgClass: "from-emerald-500/10 to-transparent",
      borderClass: "group-hover:border-emerald-500/30",
    },
    {
      icon: Layers,
      title: t("items.design.title"),
      desc: t("items.design.desc"),
      color: "text-orange-500",
      bgClass: "from-orange-500/10 to-transparent",
      borderClass: "group-hover:border-orange-500/30",
    },
  ];

  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-background">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] pointer-events-none translate-x-1/3 -translate-y-1/3" />

      <div className="container relative z-10 mx-auto px-4 max-w-[1400px]">
        <div className="text-center mb-16 md:mb-24">
          <AnimateIn preset="fadeUp" delay={0}>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary mb-4">
              {t("badge")}
            </p>
          </AnimateIn>
          <AnimateIn preset="fadeUp" delay={100}>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6 text-balance">
              {t("title")}
            </h2>
          </AnimateIn>
          <AnimateIn preset="fadeUp" delay={200}>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
              {t("description")}
            </p>
          </AnimateIn>
        </div>

        <AnimateInGroup
          stagger="fast"
          className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto"
        >
          {capabilities.map((item, idx) => (
            <AnimateIn key={idx} preset="emerge">
              <Card
                className={`group relative p-8 h-full bg-background/50 backdrop-blur-xl border-border/50 rounded-3xl overflow-hidden transition-all duration-500 ${item.borderClass} hover:shadow-2xl hover:-translate-y-1`}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${item.bgClass} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                />

                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-500">
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>

                  <h3 className="text-2xl font-black tracking-tight mb-4">{item.title}</h3>

                  <p className="text-muted-foreground text-[15px] leading-relaxed">{item.desc}</p>
                </div>
              </Card>
            </AnimateIn>
          ))}
        </AnimateInGroup>
      </div>
    </section>
  );
}
