"use client";

/**
 * AI vendor brand art — @lobehub/icons registry.
 * Keep PROVIDER_BRAND in sync with ListingProvider in listing-catalog.ts.
 */

import {
  Baichuan,
  Claude,
  Cohere,
  DeepSeek,
  Doubao,
  Gemini,
  Grok,
  Hunyuan,
  Meta,
  Minimax,
  Mistral,
  Moonshot,
  Nvidia,
  OpenAI,
  Perplexity,
  Qwen,
  Yi,
  Zhipu,
} from "@lobehub/icons";
import type { ComponentType, CSSProperties } from "react";
import type { ListingProvider } from "@/lib/listing-catalog";
import { PROVIDER_LABEL } from "@/lib/listing-catalog";

type IconProps = {
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  color?: string;
};

type CombineProps = IconProps & { type?: "color" | "mono" | string };

export type LobeBrandIcon = ComponentType<IconProps> & {
  Color?: ComponentType<IconProps>;
  Combine?: ComponentType<CombineProps>;
  Text?: ComponentType<IconProps>;
  title?: string;
  colorPrimary?: string;
};

export type CoverTheme = { wash: string };

type BrandEntry = {
  Icon: LobeBrandIcon;
  colorMark: boolean;
  label?: string;
};

/**
 * A provider's cover is its own brand hue (the registry's `colorPrimary`) mixed
 * into the card surface — never a fixed pastel. The card token has a light and
 * a dark value, so the same recipe gives a soft tint in light mode and a deep
 * one in dark, and the cover cannot glare out of a dark page.
 */
function coverFor(Icon: LobeBrandIcon): CoverTheme {
  const hue = Icon.colorPrimary ?? "var(--neutral-8)";
  return {
    wash: `linear-gradient(145deg, color-mix(in oklab, ${hue} 26%, hsl(var(--card))) 0%, color-mix(in oklab, ${hue} 12%, hsl(var(--card))) 55%, color-mix(in oklab, ${hue} 5%, hsl(var(--card))) 100%)`,
  };
}

export const PROVIDER_BRAND: Record<ListingProvider, BrandEntry> = {
  openai: {
    Icon: OpenAI as LobeBrandIcon,
    colorMark: false,
  },
  anthropic: {
    Icon: Claude as LobeBrandIcon,
    colorMark: true,
    label: "Anthropic",
  },
  google: {
    Icon: Gemini as LobeBrandIcon,
    colorMark: true,
    label: "Google",
  },
  xai: {
    Icon: Grok as LobeBrandIcon,
    colorMark: false,
    label: "xAI",
  },
  deepseek: {
    Icon: DeepSeek as LobeBrandIcon,
    colorMark: true,
  },
  moonshot: {
    Icon: Moonshot as LobeBrandIcon,
    colorMark: false,
  },
  mistral: {
    Icon: Mistral as LobeBrandIcon,
    colorMark: true,
  },
  meta: {
    Icon: Meta as LobeBrandIcon,
    colorMark: true,
  },
  qwen: {
    Icon: Qwen as LobeBrandIcon,
    colorMark: true,
    label: "通义千问",
  },
  zhipu: {
    Icon: Zhipu as LobeBrandIcon,
    colorMark: true,
    label: "智谱",
  },
  minimax: {
    Icon: Minimax as LobeBrandIcon,
    colorMark: true,
  },
  cohere: {
    Icon: Cohere as LobeBrandIcon,
    colorMark: true,
  },
  perplexity: {
    Icon: Perplexity as LobeBrandIcon,
    colorMark: true,
  },
  baichuan: {
    Icon: Baichuan as LobeBrandIcon,
    colorMark: true,
    label: "百川",
  },
  yi: {
    Icon: Yi as LobeBrandIcon,
    colorMark: true,
    label: "零一万物",
  },
  doubao: {
    Icon: Doubao as LobeBrandIcon,
    colorMark: true,
    label: "豆包",
  },
  hunyuan: {
    Icon: Hunyuan as LobeBrandIcon,
    colorMark: true,
    label: "腾讯混元",
  },
  nvidia: {
    Icon: Nvidia as LobeBrandIcon,
    colorMark: true,
    label: "NVIDIA",
  },
  other: {
    Icon: Meta as LobeBrandIcon,
    colorMark: false,
    label: "Other",
  },
};

export const PROVIDER_COVER: Record<ListingProvider, CoverTheme> = Object.fromEntries(
  (Object.keys(PROVIDER_BRAND) as ListingProvider[]).map((k) => [
    k,
    coverFor(PROVIDER_BRAND[k].Icon),
  ]),
) as Record<ListingProvider, CoverTheme>;

function brandTitle(provider: ListingProvider): string {
  const entry = PROVIDER_BRAND[provider];
  return entry.Icon.title ?? entry.label ?? PROVIDER_LABEL[provider];
}

export function BrandMark({
  provider,
  size = 20,
  className,
  forceMono = false,
}: {
  provider: ListingProvider;
  size?: number;
  className?: string;
  forceMono?: boolean;
}) {
  if (provider === "other") {
    return (
      <span
        className={className}
        style={{
          display: "inline-flex",
          width: size,
          height: size,
          borderRadius: 6,
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.max(10, Number(size) * 0.45),
          fontWeight: 700,
          background: "var(--neutral-4)",
          color: "var(--neutral-11)",
        }}
        aria-hidden
      >
        AI
      </span>
    );
  }
  const { Icon, colorMark } = PROVIDER_BRAND[provider];
  const useColor = !forceMono && colorMark && Icon.Color;
  const Mark = useColor && Icon.Color ? Icon.Color : Icon;
  const props: IconProps = { size };
  // Mono marks draw in currentColor: foreground ink, so black-on-black vendor
  // marks (OpenAI, xAI) turn light in dark mode instead of disappearing.
  const markClass = useColor ? className : [className, "text-foreground"].filter(Boolean).join(" ");
  if (markClass) props.className = markClass;
  return <Mark {...props} />;
}

export function BrandPill({ provider, size = 22 }: { provider: ListingProvider; size?: number }) {
  const entry = PROVIDER_BRAND[provider];
  const title = brandTitle(provider);
  const markSize = typeof size === "number" ? size : 22;

  if (provider === "other") {
    return (
      <span
        className="inline-flex max-w-full flex-row flex-nowrap items-center gap-2 text-foreground"
        title={title}
      >
        <BrandMark provider="other" size={markSize} />
        <span className="text-sm leading-none font-semibold tracking-tight">Other</span>
      </span>
    );
  }

  const { Icon, colorMark } = entry;
  const useColor = colorMark && Icon.Color;
  const Mark = useColor && Icon.Color ? Icon.Color : Icon;
  const Wordmark = Icon.Text;

  // Ink is the foreground token via currentColor, so the wordmark and any mono
  // mark follow the theme; colour marks keep their registered colours.
  return (
    <span
      className="inline-flex max-w-full flex-row flex-nowrap items-center gap-2 text-foreground"
      title={title}
    >
      <Mark size={markSize} />
      {Wordmark ? (
        <Wordmark size={Math.round(markSize * 0.82)} />
      ) : (
        <span className="text-sm leading-none font-semibold tracking-tight">{title}</span>
      )}
    </span>
  );
}
