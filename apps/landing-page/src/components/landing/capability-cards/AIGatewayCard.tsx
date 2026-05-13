"use client";

import { Anthropic, DeepSeek, Gemini, OpenAI, Sparkles } from "@nebutra/ui/icons";
import { AnimatedBeam } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";
import { useRef } from "react";
import { createPublicDocsUrl } from "@/lib/docs-links";
import { CapabilityCard } from "./CapabilityCard";

type ProviderIcon = ComponentType<{ size?: number; className?: string }>;

const CURVATURES = [-30, -10, 10, 30];
const BEAM_DELAYS = [0, 0.6, 1.2, 1.8];
const getProviderIcon = (icon: ProviderIcon) => icon;
const OpenAIIcon = getProviderIcon(OpenAI as ProviderIcon);
const AnthropicIcon = getProviderIcon(Anthropic as ProviderIcon);
const GeminiIcon = getProviderIcon(Gemini as ProviderIcon);
const DeepSeekIcon = getProviderIcon(DeepSeek as ProviderIcon);

export function AIGatewayCard() {
  "use no memo";

  const t = useTranslations("microLanding.capability");

  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<HTMLDivElement>(null);
  const openaiRef = useRef<HTMLDivElement>(null);
  const anthropicRef = useRef<HTMLDivElement>(null);
  const geminiRef = useRef<HTMLDivElement>(null);
  const deepseekRef = useRef<HTMLDivElement>(null);

  return (
    <CapabilityCard
      title={t("aiGateway.title")}
      description={t("aiGateway.desc")}
      ctaText={t("aiGateway.cta")}
      ctaHref={createPublicDocsUrl("ai/overview")}
      icon={<Sparkles />}
    >
      {/* Vercel Bleed AnimatedBeam Canvas — expanded vertical space */}
      <div
        ref={containerRef}
        className="w-full max-w-[380px] mt-auto relative flex flex-col items-center justify-center gap-8 py-8"
      >
        {/* Code Window Mockup */}
        <div
          style={{ boxShadow: "var(--ring-hairline)" }}
          className="w-full max-w-[340px] bg-background dark:bg-[var(--neutral-2)] border border-[var(--neutral-6)] rounded-[var(--radius-button)] overflow-hidden z-20 transition-transform duration-150 hover:-translate-y-px"
        >
          <div className="flex items-center px-4 py-2.5 bg-muted/30 dark:bg-white/[0.02] border-b border-border/50 dark:border-white/5">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-border/80 dark:bg-zinc-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-border/80 dark:bg-zinc-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-border/80 dark:bg-zinc-700" />
            </div>
            <span className="ml-3 text-muted-foreground dark:text-zinc-500 text-[10px] uppercase font-semibold tracking-widest">
              endpoint.ts
            </span>
          </div>
          <div className="p-5 font-mono text-[12px] leading-relaxed text-foreground dark:text-zinc-300">
            <div>
              <span className="text-primary dark:text-blue-400">import</span>{" "}
              {`{ createEdgeRouter }`} <span className="text-primary dark:text-blue-400">from</span>{" "}
              <span className="text-emerald-600 dark:text-emerald-300">'@nebutra/ai';</span>
            </div>
            <div className="mt-3 text-muted-foreground dark:text-zinc-600 font-medium">
              {"// Auto-fallback & latency routing"}
            </div>
            <div>
              <span className="text-primary dark:text-blue-400">export const</span> POST ={" "}
              <span className="text-purple-600 dark:text-purple-400">createEdgeRouter</span>({`{`}
            </div>
            <div className="pl-4">
              strategy:{" "}
              <span className="text-emerald-600 dark:text-emerald-300">'lowest-latency'</span>,
            </div>
            <div className="pl-4">
              models: [<span className="text-emerald-600 dark:text-emerald-300">'gpt-4'</span>,{" "}
              <span className="text-emerald-600 dark:text-emerald-300">'claude-3'</span>],
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
            className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-[var(--radius-card)] bg-background border border-[var(--neutral-6)] dark:bg-zinc-950 dark:border-white/10 z-10"
            style={{ boxShadow: "var(--ring-hairline)" }}
          >
            <span
              className="text-[11px] font-semibold text-foreground dark:text-white leading-tight text-center"
              style={{ letterSpacing: "var(--tracking-tight)" }}
            >
              Your
              <br />
              SaaS
            </span>
          </div>

          {/* External Providers */}
          <div className="flex flex-col gap-3 z-10">
            <div
              ref={openaiRef}
              className="flex items-center gap-2.5 rounded-full border border-border/50 bg-background dark:bg-zinc-950 dark:border-white/10 shadow-sm px-4 py-1.5 backdrop-blur-sm"
            >
              <OpenAIIcon size={14} className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[11px] font-semibold text-foreground/80 dark:text-zinc-300 tracking-wide">
                OpenAI
              </span>
            </div>
            <div
              ref={anthropicRef}
              className="flex items-center gap-2.5 rounded-full border border-border/50 bg-background dark:bg-zinc-950 dark:border-white/10 shadow-sm px-4 py-1.5 backdrop-blur-sm"
            >
              <AnthropicIcon size={14} className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[11px] font-semibold text-foreground/80 dark:text-zinc-300 tracking-wide">
                Anthropic
              </span>
            </div>
            <div
              ref={geminiRef}
              className="flex items-center gap-2.5 rounded-full border border-border/50 bg-background dark:bg-zinc-950 dark:border-white/10 shadow-sm px-4 py-1.5 backdrop-blur-sm"
            >
              <GeminiIcon size={14} className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[11px] font-semibold text-foreground/80 dark:text-zinc-300 tracking-wide">
                Gemini
              </span>
            </div>
            <div
              ref={deepseekRef}
              className="flex items-center gap-2.5 rounded-full border border-border/50 bg-background dark:bg-zinc-950 dark:border-white/10 shadow-sm px-4 py-1.5 backdrop-blur-sm"
            >
              <DeepSeekIcon size={14} className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[11px] font-semibold text-foreground/80 dark:text-zinc-300 tracking-wide">
                DeepSeek
              </span>
            </div>
          </div>
        </div>

        {/* Rendering the connection lines */}
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={appRef}
          toRef={openaiRef}
          curvature={CURVATURES[0]}
          delay={BEAM_DELAYS[0]}
          duration={4.5}
          pathColor="currentColor"
          className="text-border dark:text-white/10"
          pathWidth={1}
          pathOpacity={0.8}
          gradientStartColor="var(--brand-primary)"
          gradientStopColor="var(--brand-accent)"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={appRef}
          toRef={anthropicRef}
          curvature={CURVATURES[1]}
          delay={BEAM_DELAYS[1]}
          duration={4.5}
          pathColor="currentColor"
          className="text-border dark:text-white/10"
          pathWidth={1}
          pathOpacity={0.8}
          gradientStartColor="var(--brand-primary)"
          gradientStopColor="var(--brand-accent)"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={appRef}
          toRef={geminiRef}
          curvature={CURVATURES[2]}
          delay={BEAM_DELAYS[2]}
          duration={4.5}
          pathColor="currentColor"
          className="text-border dark:text-white/10"
          pathWidth={1}
          pathOpacity={0.8}
          gradientStartColor="var(--brand-primary)"
          gradientStopColor="var(--brand-accent)"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={appRef}
          toRef={deepseekRef}
          curvature={CURVATURES[3]}
          delay={BEAM_DELAYS[3]}
          duration={4.5}
          pathColor="currentColor"
          className="text-border dark:text-white/10"
          pathWidth={1}
          pathOpacity={0.8}
          gradientStartColor="var(--brand-primary)"
          gradientStopColor="var(--brand-accent)"
        />
      </div>
    </CapabilityCard>
  );
}
