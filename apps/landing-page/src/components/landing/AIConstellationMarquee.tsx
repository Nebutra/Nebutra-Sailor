"use client";

import {
  Anthropic,
  Claude,
  Cursor,
  DeepSeek,
  Flux,
  Gemini,
  Google,
  Grok,
  HuggingFace,
  LangChain,
  LangGraph,
  MCP,
  Meta,
  Midjourney,
  Mistral,
  N8n,
  Ollama,
  OpenAI,
  Qwen,
  Railway,
  SiliconCloud,
  Smithery,
  Vercel,
} from "@nebutra/ui/icons";
import { KineticSignalMarquee } from "@nebutra/ui/patterns";
import { InfiniteSlider } from "@nebutra/ui/primitives";
import Link from "next/link";
import type * as React from "react";
import { createPublicDocsUrl } from "@/lib/docs-links";
import { AnimateIn } from "./AnimateIn";

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

interface AiIcon {
  icon: IconComponent & { Color?: IconComponent };
  name: string;
}

const AI_ICONS_ROW1: AiIcon[] = [
  { icon: OpenAI, name: "OpenAI" },
  { icon: Anthropic, name: "Anthropic" },
  { icon: Claude, name: "Claude" },
  { icon: Gemini, name: "Gemini" },
  { icon: DeepSeek, name: "DeepSeek" },
  { icon: Grok, name: "Grok" },
  { icon: Mistral, name: "Mistral" },
  { icon: Meta, name: "Meta" },
  { icon: Google, name: "Google" },
  { icon: Qwen, name: "Qwen" },
  { icon: HuggingFace, name: "HuggingFace" },
];

const AI_ICONS_ROW2: AiIcon[] = [
  { icon: Cursor, name: "Cursor" },
  { icon: LangChain, name: "LangChain" },
  { icon: LangGraph, name: "LangGraph" },
  { icon: MCP, name: "MCP" },
  { icon: N8n, name: "n8n" },
  { icon: Ollama, name: "Ollama" },
  { icon: Smithery, name: "Smithery" },
  { icon: Flux, name: "Flux" },
  { icon: Midjourney, name: "Midjourney" },
  { icon: Vercel, name: "Vercel" },
  { icon: Railway, name: "Railway" },
  { icon: SiliconCloud, name: "SiliconCloud" },
];

function IconChip({ icon, name }: AiIcon) {
  const Component = icon.Color ?? icon;
  return (
    <div
      style={{ boxShadow: "var(--ring-hairline)" }}
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-[var(--neutral-6)] bg-background/80 hover:border-[var(--neutral-7)] hover:bg-[var(--neutral-3)] hover:-translate-y-px transition-all duration-150 group select-none"
    >
      <Component size={20} className="size-5 shrink-0" />
      <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors whitespace-nowrap">
        {name}
      </span>
    </div>
  );
}

/**
 * AIConstellationMarquee — ML-2.2
 *
 * Marquee rows showing a curated subset of AI integrations.
 * Two rows: row 1 scrolls forward, row 2 scrolls reverse.
 * Provider count is sourced from @nebutra/ai-providers (47 entries).
 */
export function AIConstellationMarquee() {
  return (
    <KineticSignalMarquee
      className="w-full max-w-[1400px] mt-14"
      eyebrow={
        <AnimateIn preset="emerge" inView>
          INTEGRATED WITH 47 AI PROVIDERS
        </AnimateIn>
      }
    >
      <AnimateIn preset="fade" inView delay={0.15}>
        <div className="space-y-3">
          {/* Row 1 — forward */}
          <InfiniteSlider gap={10} duration={35} durationOnHover={90}>
            {AI_ICONS_ROW1.map((item) => (
              <IconChip key={item.name} icon={item.icon} name={item.name} />
            ))}
          </InfiniteSlider>

          {/* Row 2 — reverse */}
          <InfiniteSlider gap={10} duration={28} durationOnHover={90} reverse>
            {AI_ICONS_ROW2.map((item) => (
              <IconChip key={item.name} icon={item.icon} name={item.name} />
            ))}
          </InfiniteSlider>
        </div>
      </AnimateIn>

      <AnimateIn preset="fade" inView delay={0.3} className="text-center mt-6">
        <Link
          href={createPublicDocsUrl("ai/overview")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
        >
          View all AI integration docs
          <span className="text-primary">→</span>
        </Link>
      </AnimateIn>
    </KineticSignalMarquee>
  );
}

AIConstellationMarquee.displayName = "AIConstellationMarquee";
