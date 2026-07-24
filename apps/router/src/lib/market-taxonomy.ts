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
  { id: "app", label: "应用集市", href: "/?product_type=tool", icon: "app-store", match: "tool" },
  { id: "api", label: "API 集市", href: "/?product_type=api", icon: "api-store", match: "api" },
  { id: "models", label: "模型目录", href: "/models", icon: "models", match: "models" },
  {
    id: "client",
    label: "客户端",
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
    label: "语言大模型",
    icon: "llm",
    hint: "对话 · 推理",
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
    label: "图片生成",
    icon: "image-gen",
    hint: "文生图",
    listingTags: ["image", "multimodal"],
    brands: ["openai", "google", "xai", "qwen", "zhipu", "minimax", "doubao"],
    bannerKey: "image",
  },
  {
    id: "image-edit",
    label: "图片处理",
    icon: "image-edit",
    hint: "编辑 · 抠图",
    listingTags: ["image"],
    brands: ["openai", "google", "qwen", "zhipu"],
  },
  {
    id: "video",
    label: "视频生成",
    icon: "video",
    hint: "文生视频",
    listingTags: ["video", "multimodal"],
    brands: ["openai", "google", "xai", "minimax", "doubao"],
    bannerKey: "video",
  },
  {
    id: "audio",
    label: "音视频处理",
    icon: "audio",
    hint: "语音 · 转写",
    listingTags: ["audio"],
    brands: ["openai", "google", "minimax", "qwen"],
    bannerKey: "audio",
  },
  {
    id: "data",
    label: "信息处理",
    icon: "data",
    hint: "检索 · 抽取",
    listingTags: ["data", "other"],
    brands: ["openai", "google", "perplexity", "cohere"],
    bannerKey: "data",
  },
  {
    id: "rag",
    label: "RAG 相关",
    icon: "rag",
    hint: "知识增强",
    listingTags: ["rag", "data"],
    brands: ["openai", "google", "zhipu", "qwen"],
  },
  {
    id: "tools",
    label: "工具 API",
    icon: "tools",
    hint: "Agent · 工具",
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
    label: "机器人",
    icon: "bots",
    chips: ["聊天机器人", "绘画机器人", "知识库"],
    href: "http://localhost:3105",
  },
  {
    id: "productivity",
    label: "工作效率",
    icon: "productivity",
    chips: ["模型竞技场", "AI 文案助手"],
    href: "http://localhost:3105",
  },
  {
    id: "academic",
    label: "学术相关",
    icon: "academic",
    chips: ["PDF 工具箱", "AI 专利搜索"],
    href: "http://localhost:3105",
  },
  {
    id: "image",
    label: "图片处理",
    icon: "image-edit",
    chips: ["3D 摄影棚", "Canvas"],
    href: "http://localhost:3105",
  },
  {
    id: "audio",
    label: "音频相关",
    icon: "audio",
    chips: ["语音生成", "AI 音乐"],
    href: "http://localhost:3105",
  },
  {
    id: "code",
    label: "代码相关",
    icon: "code",
    chips: ["网页生成器", "Forge"],
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
  { href: "/dashboard", label: "汇总", icon: "data-summary" },
  { href: "/keys", label: "Keys", icon: "api-keys" },
  { href: "/wallet", label: "钱包", icon: "wallet" },
  { href: "/use", label: "试用", icon: "agent" },
  { href: "/docs", label: "文档", icon: "docs" },
  { href: "/models", label: "更多", icon: "more" },
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
