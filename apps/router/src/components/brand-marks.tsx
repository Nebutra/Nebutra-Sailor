"use client";

/**
 * AI vendor brand art — @lobehub/icons registry (best practice).
 *
 * Compound API:
 *   Icon / Icon.Color / Icon.Combine / Icon.title
 *
 * Keep PROVIDER_BRAND in sync with ListingProvider in listing-catalog.ts.
 * Preview: https://icons.lobehub.com/
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

type CombineProps = IconProps & {
  type?: "color" | "mono" | string;
};

export type LobeBrandIcon = ComponentType<IconProps> & {
  Color?: ComponentType<IconProps>;
  Combine?: ComponentType<CombineProps>;
  Text?: ComponentType<IconProps>;
  title?: string;
  colorPrimary?: string;
};

export type CoverTheme = {
  wash: string;
  dark: boolean;
};

type BrandEntry = {
  Icon: LobeBrandIcon;
  colorMark: boolean;
  cover: CoverTheme;
  label?: string;
};

/** All shelf brands — not just OpenAI / Claude / Gemini */
export const PROVIDER_BRAND: Record<ListingProvider, BrandEntry> = {
  openai: {
    Icon: OpenAI as LobeBrandIcon,
    colorMark: false,
    cover: {
      wash: "linear-gradient(145deg, #dbeafe 0%, #e0e7ff 42%, #f5f3ff 100%)",
      dark: false,
    },
  },
  anthropic: {
    Icon: Claude as LobeBrandIcon,
    colorMark: true,
    cover: {
      wash: "linear-gradient(145deg, #f5e6d3 0%, #f0d9c2 45%, #faf5f0 100%)",
      dark: false,
    },
    label: "Anthropic",
  },
  google: {
    Icon: Gemini as LobeBrandIcon,
    colorMark: true,
    cover: {
      wash: "linear-gradient(145deg, #c7d2fe 0%, #bfdbfe 40%, #e0f2fe 100%)",
      dark: false,
    },
    label: "Google",
  },
  xai: {
    Icon: Grok as LobeBrandIcon,
    colorMark: false,
    cover: {
      wash: "linear-gradient(160deg, #0a0a0a 0%, #171717 55%, #262626 100%)",
      dark: true,
    },
    label: "xAI",
  },
  deepseek: {
    Icon: DeepSeek as LobeBrandIcon,
    colorMark: true,
    cover: {
      wash: "linear-gradient(145deg, #bfdbfe 0%, #93c5fd 40%, #dbeafe 100%)",
      dark: false,
    },
  },
  moonshot: {
    Icon: Moonshot as LobeBrandIcon,
    colorMark: false,
    cover: {
      wash: "linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
      dark: true,
    },
  },
  mistral: {
    Icon: Mistral as LobeBrandIcon,
    colorMark: true,
    cover: {
      wash: "linear-gradient(145deg, #ffedd5 0%, #fed7aa 45%, #fff7ed 100%)",
      dark: false,
    },
  },
  meta: {
    Icon: Meta as LobeBrandIcon,
    colorMark: true,
    cover: {
      wash: "linear-gradient(145deg, #dbeafe 0%, #bfdbfe 40%, #e0e7ff 100%)",
      dark: false,
    },
  },
  qwen: {
    Icon: Qwen as LobeBrandIcon,
    colorMark: true,
    cover: {
      wash: "linear-gradient(145deg, #dbeafe 0%, #bfdbfe 35%, #eff6ff 100%)",
      dark: false,
    },
    label: "通义千问",
  },
  zhipu: {
    Icon: Zhipu as LobeBrandIcon,
    colorMark: true,
    cover: {
      wash: "linear-gradient(145deg, #e0e7ff 0%, #c7d2fe 40%, #eef2ff 100%)",
      dark: false,
    },
    label: "智谱",
  },
  minimax: {
    Icon: Minimax as LobeBrandIcon,
    colorMark: true,
    cover: {
      wash: "linear-gradient(145deg, #fce7f3 0%, #fbcfe8 40%, #fdf2f8 100%)",
      dark: false,
    },
  },
  cohere: {
    Icon: Cohere as LobeBrandIcon,
    colorMark: true,
    cover: {
      wash: "linear-gradient(145deg, #d1fae5 0%, #a7f3d0 40%, #ecfdf5 100%)",
      dark: false,
    },
  },
  perplexity: {
    Icon: Perplexity as LobeBrandIcon,
    colorMark: true,
    cover: {
      wash: "linear-gradient(145deg, #cffafe 0%, #a5f3fc 40%, #ecfeff 100%)",
      dark: false,
    },
  },
  baichuan: {
    Icon: Baichuan as LobeBrandIcon,
    colorMark: true,
    cover: {
      wash: "linear-gradient(145deg, #ffedd5 0%, #fed7aa 40%, #fff7ed 100%)",
      dark: false,
    },
    label: "百川",
  },
  yi: {
    Icon: Yi as LobeBrandIcon,
    colorMark: true,
    cover: {
      wash: "linear-gradient(145deg, #e0e7ff 0%, #c7d2fe 40%, #f5f3ff 100%)",
      dark: false,
    },
    label: "零一万物",
  },
  doubao: {
    Icon: Doubao as LobeBrandIcon,
    colorMark: true,
    cover: {
      wash: "linear-gradient(145deg, #fef3c7 0%, #fde68a 40%, #fffbeb 100%)",
      dark: false,
    },
    label: "豆包",
  },
  hunyuan: {
    Icon: Hunyuan as LobeBrandIcon,
    colorMark: true,
    cover: {
      wash: "linear-gradient(145deg, #dbeafe 0%, #93c5fd 40%, #eff6ff 100%)",
      dark: false,
    },
    label: "腾讯混元",
  },
  nvidia: {
    Icon: Nvidia as LobeBrandIcon,
    colorMark: true,
    cover: {
      wash: "linear-gradient(145deg, #d1fae5 0%, #a7f3d0 40%, #ecfdf5 100%)",
      dark: false,
    },
    label: "NVIDIA",
  },
  other: {
    Icon: Meta as LobeBrandIcon,
    colorMark: false,
    cover: {
      wash: "linear-gradient(145deg, #e2e8f0 0%, #f1f5f9 50%, #f8fafc 100%)",
      dark: false,
    },
    label: "Other",
  },
};

export const PROVIDER_COVER: Record<ListingProvider, CoverTheme> = Object.fromEntries(
  (Object.keys(PROVIDER_BRAND) as ListingProvider[]).map((k) => [k, PROVIDER_BRAND[k].cover]),
) as Record<ListingProvider, CoverTheme>;

/** a11y / tooltip only — never render as visible wordmark */
function brandTitle(provider: ListingProvider): string {
  const entry = PROVIDER_BRAND[provider];
  return entry.Icon.title ?? entry.label ?? PROVIDER_LABEL[provider];
}

export function BrandMark({
  provider,
  size = 20,
  className,
  forceMono = false,
  /** light = 白底卡（flyout）；dark = 黑底；auto = 跟 cover.dark */
  surface = "auto",
}: {
  provider: ListingProvider;
  size?: number;
  className?: string;
  forceMono?: boolean;
  surface?: "auto" | "light" | "dark";
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

  const { Icon, colorMark, cover } = PROVIDER_BRAND[provider];
  const onDark = surface === "dark" || (surface === "auto" && cover.dark);
  const useColor = !forceMono && colorMark && !onDark && Icon.Color;
  const Mark = useColor && Icon.Color ? Icon.Color : Icon;
  const props: IconProps = { size };
  if (className) props.className = className;
  if (!useColor) {
    props.style = { color: onDark ? "#fafafa" : "#0f172a" };
  }

  return <Mark {...props} />;
}

/**
 * 品牌胶囊：左 mark + 右官方字标（@lobehub/icons Icon.Text SVG）。
 * tone: auto 跟 cover.dark；light=深色字（白底胶囊）；dark=浅色字（黑底）
 */
export function BrandPill({
  provider,
  size = 22,
  tone = "auto",
}: {
  provider: ListingProvider;
  size?: number;
  tone?: "auto" | "light" | "dark";
}) {
  const entry = PROVIDER_BRAND[provider];
  const title = brandTitle(provider);
  const onDark = tone === "dark" || (tone === "auto" && entry.cover.dark);
  const ink = onDark ? "#fafafa" : "#0f172a";
  const markSize = typeof size === "number" ? size : 22;
  const textSize = Math.round(markSize * 0.82);

  if (provider === "other") {
    return (
      <span
        className="inline-flex max-w-full flex-row flex-nowrap items-center gap-2"
        style={{ color: ink }}
        title={title}
      >
        <BrandMark provider="other" size={markSize} />
        <span className="text-[13px] leading-none font-semibold tracking-tight">Other</span>
      </span>
    );
  }

  const { Icon, colorMark } = entry;
  // 白底胶囊优先彩色 mark；黑底用 mono + 浅字
  const useColor = colorMark && !onDark && Icon.Color;
  const Mark = useColor && Icon.Color ? Icon.Color : Icon;
  const Wordmark = Icon.Text;
  const markProps: IconProps = { size: markSize };
  if (onDark && !useColor) markProps.style = { color: ink };

  return (
    <span
      className="inline-flex max-w-full flex-row flex-nowrap items-center gap-2"
      style={{ color: ink }}
      title={title}
    >
      <span className="inline-flex shrink-0 items-center justify-center leading-none">
        <Mark {...markProps} />
      </span>
      {Wordmark ? (
        <span className="inline-flex min-w-0 shrink items-center overflow-hidden leading-none">
          <Wordmark size={textSize} style={{ color: ink, maxWidth: "100%" }} />
        </span>
      ) : (
        <span className="min-w-0 truncate text-[13px] leading-none font-semibold tracking-tight">
          {title}
        </span>
      )}
    </span>
  );
}
