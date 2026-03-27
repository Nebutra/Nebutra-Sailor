"use client";

import { Anthropic, DeepSeek, Gemini, OpenAI, Sparkles } from "@nebutra/ui/icons";
import { AnimatedBeam } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { CapabilityCard } from "./CapabilityCard";

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

interface Provider {
  icon: IconComponent & { Color?: IconComponent };
  name: string;
  ref: React.RefObject<HTMLDivElement | null>;
}

const CURVATURES = [-30, -10, 10, 30];
const BEAM_DELAYS = [0, 0.6, 1.2, 1.8];

export function AIGatewayCard() {
  const t = useTranslations("microLanding.capability");

  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<HTMLDivElement>(null);
  const openaiRef = useRef<HTMLDivElement>(null);
  const anthropicRef = useRef<HTMLDivElement>(null);
  const geminiRef = useRef<HTMLDivElement>(null);
  const deepseekRef = useRef<HTMLDivElement>(null);

  const providers: Provider[] = [
    { icon: OpenAI, name: "OpenAI", ref: openaiRef },
    { icon: Anthropic, name: "Anthropic", ref: anthropicRef },
    { icon: Gemini, name: "Gemini", ref: geminiRef },
    { icon: DeepSeek, name: "DeepSeek", ref: deepseekRef },
  ];

  return (
    <CapabilityCard
      title={t("aiGateway.title")}
      description={t("aiGateway.desc")}
      ctaText={t("aiGateway.cta")}
      ctaHref="/docs/ai-integrations"
      icon={<Sparkles />}
    >
      {/* Vercel Bleed AnimatedBeam Canvas */}
      <div
        ref={containerRef}
        className="w-full max-w-[380px] mt-auto relative flex flex-col items-center justify-center gap-12 py-8"
      >
        <div className="w-full flex items-center justify-between z-10 px-4">
          {/* Source Node */}
          <div
            ref={appRef}
            className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-3xl bg-background border border-border/80 shadow-lg dark:bg-zinc-950 dark:border-white/10 dark:shadow-[0_0_30px_rgba(255,255,255,0.05)] z-10"
          >
            <span className="text-[11px] font-black text-foreground dark:text-white leading-tight text-center tracking-tighter">
              Your
              <br />
              SaaS
            </span>
          </div>

          {/* External Providers */}
          <div className="flex flex-col gap-3 z-10">
            {providers.map((provider) => {
              const Icon = provider.icon.Color ?? provider.icon;
              return (
                <div
                  key={provider.name}
                  ref={provider.ref}
                  className="flex items-center gap-2.5 rounded-full border border-border/50 bg-background dark:bg-zinc-950 dark:border-white/10 shadow-sm px-4 py-1.5 backdrop-blur-sm"
                >
                  <Icon size={14} className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-[11px] font-bold text-foreground/80 dark:text-zinc-300 tracking-wide">
                    {provider.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rendering the connection lines */}
        {providers.map((provider, i) => (
          <AnimatedBeam
            key={provider.name}
            containerRef={containerRef}
            fromRef={appRef}
            toRef={provider.ref}
            curvature={CURVATURES[i]}
            delay={BEAM_DELAYS[i]}
            duration={4.5}
            pathColor="currentColor"
            className="text-border dark:text-white/10"
            pathWidth={1}
            pathOpacity={0.8}
            gradientStartColor="var(--color-primary, #0033FE)"
            gradientStopColor="var(--brand-accent)"
          />
        ))}
      </div>
    </CapabilityCard>
  );
}
