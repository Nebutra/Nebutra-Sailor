import { forgeHref } from "@/lib/forge-url";
/**
 * Market taxonomy + shortcuts — 302-aligned shelf IA.
 * Icons: market-icons.tsx → @nebutra/icons
 * Brands: ListingProvider keys for BrandMark / filter URLs
 */

import type { ListingCategory, ListingProvider } from "@/lib/listing-catalog";
import type { MarketIconName } from "@/lib/market-icons";

export type ChannelItem = {
  id: string;
  label: string;
  href: string;
  icon: MarketIconName;
  match: "tool" | "api" | "models" | "client";
  external?: boolean;
};

export const MARKET_CHANNELS: readonly ChannelItem[] = [
  { id: "app", label: "App market", href: "/?product_type=tool", icon: "app-store", match: "tool" },
  { id: "api", label: "API market", href: "/?product_type=api", icon: "api-store", match: "api" },
  { id: "models", label: "Model catalog", href: "/models", icon: "models", match: "models" },
  {
    id: "client",
    label: "Client",
    href: forgeHref(),
    icon: "client",
    match: "client",
    external: true,
  },
] as const;

/**
 * 302-style API taxonomy rail (图/视频/语音…).
 * `listingTags` maps to ListingCategory for live inventory intersection.
 * `brands` = hover flyout default chips (order = display priority).
 */
export type ApiTaxonomyRow = {
  id: string;
  label: string;
  icon: MarketIconName;
  /** 左轨副文案：短模态词，不用品牌串 */
  hint: string;
  /** ListingCategory keys that belong to this rail row */
  listingTags: readonly ListingCategory[];
  brands: readonly ListingProvider[];
  /** Optional banner cover for this shelf */
  bannerKey?: string;
};

export const MARKET_API_TAXONOMY: readonly ApiTaxonomyRow[] = [
  {
    id: "llm",
    label: "Language models",
    icon: "llm",
    hint: "Chat · reasoning",
    listingTags: ["chat", "reasoning", "fast"],
    brands: [
      "openai",
      "anthropic",
      "google",
      "xai",
      "qwen",
      "zhipu",
      "moonshot",
      "deepseek",
      "doubao",
      "minimax",
      "hunyuan",
      "meta",
      "mistral",
      "yi",
      "baichuan",
      "cohere",
      "perplexity",
    ],
    bannerKey: "llm",
  },
  {
    id: "image-gen",
    label: "Image generation",
    icon: "image-gen",
    hint: "Text-to-image",
    listingTags: ["image", "multimodal"],
    brands: ["openai", "google", "xai", "qwen", "zhipu", "minimax", "doubao"],
    bannerKey: "image",
  },
  {
    id: "image-edit",
    label: "Image editing",
    icon: "image-edit",
    hint: "Edit · matting",
    listingTags: ["image"],
    brands: ["openai", "google", "qwen", "zhipu"],
  },
  {
    id: "video",
    label: "Video generation",
    icon: "video",
    hint: "Text-to-video",
    listingTags: ["video", "multimodal"],
    brands: ["openai", "google", "xai", "minimax", "doubao"],
    bannerKey: "video",
  },
  {
    id: "audio",
    label: "Audio & video",
    icon: "audio",
    hint: "Speech · transcription",
    listingTags: ["audio"],
    brands: ["openai", "google", "minimax", "qwen"],
    bannerKey: "audio",
  },
  {
    id: "data",
    label: "Information",
    icon: "data",
    hint: "Retrieval · extract",
    listingTags: ["data", "other"],
    brands: ["openai", "google", "perplexity", "cohere"],
    bannerKey: "data",
  },
  {
    id: "rag",
    label: "RAG",
    icon: "rag",
    hint: "Knowledge-augmented",
    listingTags: ["rag", "data"],
    brands: ["openai", "google", "zhipu", "qwen"],
  },
  {
    id: "tools",
    label: "Tool APIs",
    icon: "tools",
    hint: "Agent · tools",
    listingTags: ["tools", "other"],
    brands: ["openai", "anthropic", "google"],
    bannerKey: "tools",
  },
] as const;

/** @deprecated use MARKET_API_TAXONOMY — kept for models-catalog listingTags */
export const API_CATEGORY_ICON: Record<ListingCategory, MarketIconName> = {
  chat: "llm",
  fast: "fast",
  reasoning: "reasoning",
  multimodal: "multimodal",
  image: "image-gen",
  video: "video",
  audio: "audio",
  data: "data",
  rag: "rag",
  tools: "tools",
  other: "other-cat",
};

export type ToolTaxonomyRow = {
  id: string;
  label: string;
  icon: MarketIconName;
  chips: readonly string[];
  href: string;
};

export const TOOL_TAXONOMY: readonly ToolTaxonomyRow[] = [
  {
    id: "generator",
    label: "Generators",
    icon: "productivity",
    chips: ["UUID", "Lorem ipsum", "Random strings"],
    href: forgeHref("/r/generator"),
  },
  {
    id: "converter",
    label: "Converters",
    icon: "image-edit",
    chips: ["Base64", "Markdown to PDF"],
    href: forgeHref("/r/converter"),
  },
  {
    id: "formatter",
    label: "Formatters",
    icon: "code",
    chips: ["JSON", "Text case"],
    href: forgeHref("/r/formatter"),
  },
  {
    id: "checker",
    label: "Checkers",
    icon: "academic",
    chips: ["DNS leak", "ID numbers"],
    href: forgeHref("/r/checker"),
  },
  {
    id: "comparator",
    label: "Comparators",
    icon: "bots",
    chips: ["JSON diff"],
    href: forgeHref("/r/comparator"),
  },
  {
    id: "analyzer",
    label: "Analyzers",
    icon: "audio",
    chips: ["Word count", "JWT"],
    href: forgeHref("/r/analyzer"),
  },
] as const;

export type ShortcutItem = {
  href: string;
  label: string;
  icon: MarketIconName;
};

/** 右栏 Hi 宫格：6 项 2×3，短词单行，避免断行 */
export const MARKET_SHORTCUTS: readonly ShortcutItem[] = [
  { href: "/dashboard", label: "Overview", icon: "data-summary" },
  { href: "/keys", label: "Keys", icon: "api-keys" },
  { href: "/wallet", label: "Wallet", icon: "wallet" },
  { href: "/use", label: "Try", icon: "agent" },
  { href: "/docs", label: "Docs", icon: "docs" },
  { href: "/models", label: "More", icon: "more" },
] as const;
