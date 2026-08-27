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
    href: "http://localhost:3105",
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
    id: "bots",
    label: "Bots",
    icon: "bots",
    chips: ["Chat bots", "Drawing bots", "Knowledge"],
    href: "http://localhost:3105",
  },
  {
    id: "productivity",
    label: "Productivity",
    icon: "productivity",
    chips: ["Model arena", "AI writing"],
    href: "http://localhost:3105",
  },
  {
    id: "academic",
    label: "Academic",
    icon: "academic",
    chips: ["PDF toolkit", "AI patent search"],
    href: "http://localhost:3105",
  },
  {
    id: "image",
    label: "Image tools",
    icon: "image-edit",
    chips: ["3D studio", "Canvas"],
    href: "http://localhost:3105",
  },
  {
    id: "audio",
    label: "Audio",
    icon: "audio",
    chips: ["Speech", "AI music"],
    href: "http://localhost:3105",
  },
  {
    id: "code",
    label: "Code",
    icon: "code",
    chips: ["Web generator", "Forge"],
    href: "http://localhost:3105",
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

/** Static blurbs for brand flyout when inventory has no sample text */
export const BRAND_BLURB: Partial<Record<ListingProvider, string>> = {
  openai: "OpenAI 出品，通用对话与多模态旗舰",
  anthropic: "Anthropic Claude，工程与智能体向强推理",
  google: "Google Gemini，原生搜索与多模态",
  xai: "xAI Grok，工具调用与实时能力",
  deepseek: "DeepSeek，高性价比对话与推理",
  moonshot: "月之暗面 Kimi，长上下文中文能力",
  mistral: "Mistral，高效开源与商用模型",
  meta: "Meta Llama，开源生态主力",
  qwen: "通义千问，阿里云中文基座",
  zhipu: "智谱 GLM，中文基座与 Agent",
  minimax: "Minimax，MoE 通用与语音",
  cohere: "Cohere，企业检索与 Command 系列",
  perplexity: "Perplexity，搜索增强对话",
  baichuan: "百川智能，中文开源与商用",
  yi: "零一万物，中文与多语言模型",
  doubao: "豆包，字节跳动通用大模型",
  hunyuan: "腾讯混元，中文与多模态",
  nvidia: "NVIDIA Nemotron，开源推理与加速",
  other: "其他可售模型与接口",
};
