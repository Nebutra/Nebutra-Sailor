/**
 * Market center rail — 滚动图轴配置。
 * coverSrc 指向 cdn.nebutra.com/router/banners/*.png（generate-image DAG 产出）。
 */

import { publicAssetUrl } from "@nebutra/brand/metadata-helpers";
import type { ListingModel, ListingProvider } from "@/lib/listing-catalog";
import { resolveListingProvider } from "@/lib/listing-catalog";

function bannerSrc(name: string): string {
  return publicAssetUrl(`router/banners/${name}`);
}

export type MarketBanner = {
  id: string;
  kicker: string;
  title: string;
  subtitle: string;
  href: string;
  provider: ListingProvider;
  publicModel: string;
  coverSrc?: string;
  priceLine?: string;
};

/** Static modality banners (302 图/视频/语音… 货架叙事) */
export const MODALITY_BANNERS: readonly MarketBanner[] = [
  {
    id: "mod-llm",
    kicker: "模型实测",
    title: "语言大模型",
    subtitle: "对话 · 推理 · 高性价比全系可售",
    href: "/models?cate=api&tag=chat",
    provider: "openai",
    publicModel: "llm",
    coverSrc: bannerSrc("router-banner-llm.png"),
  },
  {
    id: "mod-image",
    kicker: "模型实测",
    title: "图片生成",
    subtitle: "文生图 · 多厂商统一接口",
    href: "/models?cate=api&tag=image",
    provider: "google",
    publicModel: "image",
    coverSrc: bannerSrc("router-banner-image.png"),
  },
  {
    id: "mod-video",
    kicker: "模型实测",
    title: "视频生成",
    subtitle: "文生视频 · 动态内容生产能力",
    href: "/models?cate=api&tag=video",
    provider: "xai",
    publicModel: "video",
    coverSrc: bannerSrc("router-banner-video.png"),
  },
  {
    id: "mod-audio",
    kicker: "模型实测",
    title: "音视频处理",
    subtitle: "语音合成 · 转写 · 音频理解",
    href: "/models?cate=api&tag=audio",
    provider: "openai",
    publicModel: "audio",
    coverSrc: bannerSrc("router-banner-audio.png"),
  },
  {
    id: "mod-data",
    kicker: "模型实测",
    title: "信息处理",
    subtitle: "检索 · 抽取 · 知识增强",
    href: "/models?cate=api&tag=data",
    provider: "cohere",
    publicModel: "data",
    coverSrc: bannerSrc("router-banner-data.png"),
  },
  {
    id: "mod-tools",
    kicker: "模型实测",
    title: "工具 API",
    subtitle: "开发者工具与 Agent 能力接口",
    href: "/models?cate=api&tag=tools",
    provider: "anthropic",
    publicModel: "tools",
    coverSrc: bannerSrc("router-banner-tools.png"),
  },
] as const;

const PRIORITY: ListingProvider[] = [
  "xai",
  "openai",
  "anthropic",
  "google",
  "deepseek",
  "moonshot",
];

/**
 * 轮播 = 模态叙事帧（有真图）+ 可售旗舰品牌帧（可选叠层）
 */
export function buildMarketBanners(models: readonly ListingModel[]): MarketBanner[] {
  const frames: MarketBanner[] = [...MODALITY_BANNERS];

  // append up to 2 live flagship model frames without cover (dark stack)
  const scored = [...models].map((m) => {
    const provider = resolveListingProvider(m);
    const id = m.publicModel.toLowerCase();
    let score = 50;
    if (/opus-4|sonnet-4|gpt-5\.|gemini-3|grok-4|kimi-k|deepseek-r|glm-5/.test(id)) score = 0;
    else if (/opus|sonnet|gpt-5|gemini|grok|claude|deepseek|kimi/.test(id)) score = 10;
    return { m, provider, score };
  });

  let n = 0;
  for (const p of PRIORITY) {
    if (n >= 2) break;
    const hit = scored.filter((x) => x.provider === p).sort((a, b) => a.score - b.score)[0];
    if (!hit) continue;
    frames.push(toBanner(hit.m, hit.provider));
    n++;
  }

  return frames;
}

function toBanner(m: ListingModel, provider: ListingProvider): MarketBanner {
  const inP = m.inputPerMTok > 0 ? `$${m.inputPerMTok.toFixed(m.inputPerMTok < 1 ? 2 : 0)}` : "—";
  const outP =
    m.outputPerMTok > 0 ? `$${m.outputPerMTok.toFixed(m.outputPerMTok < 1 ? 2 : 0)}` : "—";
  return {
    id: m.publicModel,
    kicker: "模型实测",
    title: displayTitle(m.publicModel),
    subtitle: m.name || m.publicModel,
    href: `/use?model=${encodeURIComponent(m.publicModel)}`,
    provider,
    publicModel: m.publicModel,
    priceLine: `入 ${inP} · 出 ${outP} /1M`,
  };
}

function displayTitle(publicModel: string): string {
  if (publicModel.length <= 18) return publicModel;
  return `${publicModel.slice(0, 16)}…`;
}
