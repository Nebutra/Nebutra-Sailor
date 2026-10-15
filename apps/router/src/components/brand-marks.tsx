"use client";

/**
 * AI vendor marks, from the @lobehub/icons registry.
 *
 * Imported per component (`es/<Brand>/components/Mono|Color`), never from the
 * package barrel: each brand's index also pulls its Avatar and Combine, which
 * import @lobehub/ui, antd-style and emotion — about 3 MB of client JavaScript
 * on every Router page to draw an 18px logo.
 *
 * Mono marks draw in currentColor (foreground ink), so black vendor marks
 * (OpenAI, xAI, Moonshot) stay visible in dark mode. Colour marks keep their
 * registered colours.
 *
 * Keep in sync with ListingProvider in listing-catalog.ts.
 */

import BaichuanColor from "@lobehub/icons/es/Baichuan/components/Color";
import ClaudeColor from "@lobehub/icons/es/Claude/components/Color";
import CohereColor from "@lobehub/icons/es/Cohere/components/Color";
import DeepSeekColor from "@lobehub/icons/es/DeepSeek/components/Color";
import DoubaoColor from "@lobehub/icons/es/Doubao/components/Color";
import GeminiColor from "@lobehub/icons/es/Gemini/components/Color";
import GrokMono from "@lobehub/icons/es/Grok/components/Mono";
import HunyuanColor from "@lobehub/icons/es/Hunyuan/components/Color";
import MetaColor from "@lobehub/icons/es/Meta/components/Color";
import MinimaxColor from "@lobehub/icons/es/Minimax/components/Color";
import MistralColor from "@lobehub/icons/es/Mistral/components/Color";
import MoonshotMono from "@lobehub/icons/es/Moonshot/components/Mono";
import NvidiaColor from "@lobehub/icons/es/Nvidia/components/Color";
import OpenAIMono from "@lobehub/icons/es/OpenAI/components/Mono";
import PerplexityColor from "@lobehub/icons/es/Perplexity/components/Color";
import QwenColor from "@lobehub/icons/es/Qwen/components/Color";
import YiColor from "@lobehub/icons/es/Yi/components/Color";
import ZhipuColor from "@lobehub/icons/es/Zhipu/components/Color";
import type { ComponentType, CSSProperties } from "react";
import type { ListingProvider } from "@/lib/listing-catalog";

type IconComponent = ComponentType<{
  size?: number | string;
  className?: string;
  style?: CSSProperties;
}>;

const MARKS: Record<Exclude<ListingProvider, "other">, { Mark: IconComponent; mono: boolean }> = {
  openai: { Mark: OpenAIMono as IconComponent, mono: true },
  anthropic: { Mark: ClaudeColor as IconComponent, mono: false },
  google: { Mark: GeminiColor as IconComponent, mono: false },
  xai: { Mark: GrokMono as IconComponent, mono: true },
  deepseek: { Mark: DeepSeekColor as IconComponent, mono: false },
  moonshot: { Mark: MoonshotMono as IconComponent, mono: true },
  mistral: { Mark: MistralColor as IconComponent, mono: false },
  meta: { Mark: MetaColor as IconComponent, mono: false },
  qwen: { Mark: QwenColor as IconComponent, mono: false },
  zhipu: { Mark: ZhipuColor as IconComponent, mono: false },
  minimax: { Mark: MinimaxColor as IconComponent, mono: false },
  cohere: { Mark: CohereColor as IconComponent, mono: false },
  perplexity: { Mark: PerplexityColor as IconComponent, mono: false },
  baichuan: { Mark: BaichuanColor as IconComponent, mono: false },
  yi: { Mark: YiColor as IconComponent, mono: false },
  doubao: { Mark: DoubaoColor as IconComponent, mono: false },
  hunyuan: { Mark: HunyuanColor as IconComponent, mono: false },
  nvidia: { Mark: NvidiaColor as IconComponent, mono: false },
};

export function BrandMark({
  provider,
  size = 20,
  className,
}: {
  provider: ListingProvider;
  size?: number;
  className?: string;
}) {
  if (provider === "other") {
    return (
      <span
        className={[
          "inline-flex items-center justify-center rounded-[var(--radius-sm)] bg-muted font-semibold text-muted-foreground",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ width: size, height: size, fontSize: Math.max(9, size * 0.45) }}
        aria-hidden
      >
        AI
      </span>
    );
  }
  const { Mark, mono } = MARKS[provider];
  const markClass = mono ? [className, "text-foreground"].filter(Boolean).join(" ") : className;
  return <Mark size={size} {...(markClass ? { className: markClass } : {})} />;
}
