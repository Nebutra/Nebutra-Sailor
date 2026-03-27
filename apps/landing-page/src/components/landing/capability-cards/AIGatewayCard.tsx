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
      {/* Vercel Bleed AnimatedBeam Canvas — expanded vertical space */}
      <div
        ref={containerRef}
        className="w-full max-w-[380px] mt-auto relative flex flex-col items-center justify-center gap-8 py-8"
      >
        {/* Code Window Mockup */}
        <div className="w-full max-w-[340px] bg-background dark:bg-[#080809] border border-border/50 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl z-20 transition-transform hover:scale-[1.02] duration-500">
          <div className="flex items-center px-4 py-2.5 bg-muted/30 dark:bg-white/[0.02] border-b border-border/50 dark:border-white/5">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-border/80 dark:bg-zinc-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-border/80 dark:bg-zinc-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-border/80 dark:bg-zinc-700" />
            </div>
            <span className="ml-3 text-muted-foreground dark:text-zinc-500 text-[10px] uppercase font-bold tracking-widest">
              endpoint.ts
            </span>
          </div>
          <div className="p-5 font-mono text-[12px] leading-relaxed text-foreground dark:text-zinc-300">
            <div>
              <span className="text-primary dark:text-blue-400">import</span> {`{ createEdgeRouter }`} <span className="text-primary dark:text-blue-400">from</span> <span className="text-emerald-600 dark:text-emerald-300">'@nebutra/ai'</span>;
            </div>
            <div className="mt-3 text-muted-foreground dark:text-zinc-600 font-medium">
              // Auto-fallback & latency routing
            </div>
            <div>
              <span className="text-primary dark:text-blue-400">export const</span> POST = <span className="text-purple-600 dark:text-purple-400">createEdgeRouter</span>({`{`}
            </div>
            <div className="pl-4">
              strategy: <span className="text-emerald-600 dark:text-emerald-300">'lowest-latency'</span>,
            </div>
            <div className="pl-4">
              models: [<span className="text-emerald-600 dark:text-emerald-300">'gpt-4'</span>, <span className="text-emerald-600 dark:text-emerald-300">'claude-3'</span>],
            </div>
            <div className="pl-4">
              stream: <span className="text-primary dark:text-blue-400">true</span>
            </div>
            <div>{`});`}</div>
          </div>
        </div>

        <div className="w-full flex items-center justify-between z-10 px-4 mt-2">
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
