/**
 * Router listing — 302-style sellable shelf:
 *
 *   Catalog facts  ← models.dev (@nebutra/ai-providers, TTL)
 *   Inventory      ← New-API / Sub2API / OpenRouter GET /models (what we can route)
 *   Shelf          ← catalog ∩ inventory  (+ always keep explicit alias ids)
 *   Alias routes   ← NEBUTRA_MODEL_ALIASES failover map
 *
 * ROUTER_LISTING_MODE:
 *   auto      — inventory when available, else catalog (default)
 *   inventory — only sellable (fail closed to alias if no inventory)
 *   catalog   — models.dev policy only (ignore inventory)
 */

import { type CatalogModel, listModelsByModality, type ModelOffering } from "@nebutra/ai-providers";
import {
  DEFAULT_ALIASES,
  getSupplyInventory,
  inventoryHas,
  listPublicModels,
  parseAliasTableJson,
  type SupplyInventory,
} from "@nebutra/router-supply";
import type { ModelRouteRow } from "@/lib/demo-store";
import { getModelRoutes } from "@/lib/demo-store";

/** models.dev raw providers we keep on the shelf */
const PREFERRED_RAW = new Set([
  "openai",
  "anthropic",
  "google",
  "google-vertex",
  "xai",
  "deepseek",
  "moonshot",
  "mistral",
  "meta",
  "amazon-bedrock",
  "alibaba",
  "qwen",
  "zhipu",
  "minimax",
  "cohere",
  "perplexity",
  "baichuan",
  "01-ai",
  "bytedance",
  "tencent",
  "baidu",
  "groq",
  "together",
  "fireworks",
  "ai21",
  "nvidia",
]);

/** Shelf modality tags — keep in sync with MARKET_API_TAXONOMY.listingTags */
export type ListingCategory =
  | "chat"
  | "reasoning"
  | "fast"
  | "multimodal"
  | "image"
  | "video"
  | "audio"
  | "data"
  | "rag"
  | "tools"
  | "other";

/** Canonical shelf brands — keep in sync with brand-marks PROVIDER_BRAND */
export type ListingProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "xai"
  | "deepseek"
  | "moonshot"
  | "mistral"
  | "meta"
  | "qwen"
  | "zhipu"
  | "minimax"
  | "cohere"
  | "perplexity"
  | "baichuan"
  | "yi"
  | "doubao"
  | "hunyuan"
  | "nvidia"
  | "other";

export interface ListingModel {
  publicModel: string;
  name: string;
  description: string;
  category: ListingCategory;
  provider: ListingProvider;
  context: string;
  inputPerMTok: number;
  outputPerMTok: number;
  routes: ModelRouteRow["routes"];
  /** Explicit alias row exists */
  routed: boolean;
  /** Present in supply inventory (New-API / OpenRouter / …) */
  sellable: boolean;
  source: "models.dev" | "alias-fallback";
}

export const CATEGORY_LABEL: Record<ListingCategory, string> = {
  chat: "语言大模型",
  reasoning: "推理模型",
  fast: "高性价比",
  multimodal: "多模态",
  image: "图片生成",
  video: "视频生成",
  audio: "音视频处理",
  data: "信息处理",
  rag: "RAG 相关",
  tools: "工具 API",
  other: "其他",
};

export const PROVIDER_LABEL: Record<ListingProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  xai: "xAI",
  deepseek: "DeepSeek",
  moonshot: "Moonshot",
  mistral: "Mistral",
  meta: "Meta",
  qwen: "通义千问",
  zhipu: "智谱",
  minimax: "Minimax",
  cohere: "Cohere",
  perplexity: "Perplexity",
  baichuan: "百川",
  yi: "零一万物",
  doubao: "豆包",
  hunyuan: "腾讯混元",
  nvidia: "NVIDIA",
  other: "Other",
};

/** Infer brand from public model id (when catalog provider is other / missing) */
export function inferProviderFromModelId(publicModel: string): ListingProvider {
  const s = publicModel.toLowerCase();
  if (/^gpt-|^o[1-4](-\b|$)|chatgpt|openai|davinci|whisper/.test(s)) return "openai";
  if (/claude|anthropic|sonnet|opus|haiku|fable/.test(s)) return "anthropic";
  if (/gemini|gemma|google/.test(s)) return "google";
  if (/grok|xai/.test(s)) return "xai";
  if (/deepseek/.test(s)) return "deepseek";
  if (/kimi|moonshot/.test(s)) return "moonshot";
  if (/mistral|mixtral|codestral|pixtral/.test(s)) return "mistral";
  if (/llama|meta-/.test(s)) return "meta";
  if (/qwen|qwq|tongyi/.test(s)) return "qwen";
  if (/glm|zhipu|chatglm/.test(s)) return "zhipu";
  if (/minimax|abab/.test(s)) return "minimax";
  if (/command-r|cohere|aya-/.test(s)) return "cohere";
  if (/perplexity|sonar/.test(s)) return "perplexity";
  if (/baichuan/.test(s)) return "baichuan";
  if (/\byi-|^yi_|01-ai/.test(s)) return "yi";
  if (/doubao|seed-/.test(s)) return "doubao";
  if (/hunyuan/.test(s)) return "hunyuan";
  if (/nvidia|nemotron|\bnv-/.test(s)) return "nvidia";
  return "other";
}

/** Resolve display brand for a listing row */
export function resolveListingProvider(m: {
  provider: ListingProvider;
  publicModel: string;
}): ListingProvider {
  if (m.provider !== "other") return m.provider;
  return inferProviderFromModelId(m.publicModel);
}

export function formatPrice(n: number): string {
  if (!n || n <= 0) return "—";
  if (n < 1) return `$${n.toFixed(2)}`;
  return `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
}

export function formatContext(n?: number): string {
  if (!n || n <= 0) return "—";
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

function bareId(id: string): string {
  const i = id.lastIndexOf("/");
  return i >= 0 ? id.slice(i + 1) : id;
}

function mapProvider(raw: string): ListingProvider {
  const r = raw.toLowerCase();
  if (r === "openai") return "openai";
  if (r === "anthropic" || r.includes("anthropic")) return "anthropic";
  if (r === "google" || r.startsWith("google-") || r === "gemini") return "google";
  if (r === "xai") return "xai";
  if (r === "deepseek") return "deepseek";
  if (r === "moonshot") return "moonshot";
  if (r === "mistral") return "mistral";
  if (r === "meta") return "meta";
  if (r === "alibaba" || r === "qwen" || r.includes("dashscope")) return "qwen";
  if (r === "zhipu" || r.includes("zhipu") || r === "chatglm") return "zhipu";
  if (r === "minimax") return "minimax";
  if (r === "cohere") return "cohere";
  if (r === "perplexity") return "perplexity";
  if (r === "baichuan") return "baichuan";
  if (r === "01-ai" || r === "01ai" || r === "yi") return "yi";
  if (r === "bytedance" || r === "doubao" || r === "byteplus") return "doubao";
  if (r === "tencent" || r === "hunyuan") return "hunyuan";
  if (r === "nvidia" || r.includes("nvidia")) return "nvidia";
  if (r === "amazon-bedrock" || r === "bedrock" || r === "amazon") {
    // Bedrock hosts multi-vendor SKUs; leave as other unless id maps later
    return "other";
  }
  return "other";
}

function classifyCategory(
  id: string,
  name: string,
  caps: { reasoning: boolean; vision: boolean },
): ListingCategory {
  const s = `${id} ${name}`.toLowerCase();
  // modality-first (302 taxonomy)
  if (/video|veo|sora|runway|kling|luma|genmo|pika/.test(s)) return "video";
  if (/tts|whisper|transcribe|speech|audio|suno|music|voice|asr/.test(s)) return "audio";
  if (
    /dall-e|dalle|imagen|flux|midjourney|stable-diffusion|sdxl|image-gen|gpt-image|seedream/.test(s)
  )
    return "image";
  if (/embed|rerank|retrieval|rag|vector|search1|firecrawl|jina/.test(s)) return "rag";
  if (/tool|function-call|computer-use|code-interpreter|agent-tool/.test(s)) return "tools";
  if (/ocr|parse|extract|document|pdf|layout/.test(s)) return "data";
  if (caps.vision || /vision|omni|multimodal/.test(s)) return "multimodal";
  if (caps.reasoning || /\bo1\b|\bo3\b|\bo4\b|reason|opus|r1|thinking/.test(s)) return "reasoning";
  if (/mini|nano|haiku|flash|lite|small|fast|instant/.test(s)) return "fast";
  if (/gpt|claude|sonnet|gemini|grok|deepseek|kimi|qwen|mistral|llama|glm|command/.test(s))
    return "chat";
  return "other";
}

function pickOffering(m: CatalogModel): ModelOffering | null {
  const preferred = m.offerings.filter((o) => PREFERRED_RAW.has(o.rawProvider));
  const pool = preferred.length > 0 ? preferred : m.offerings;
  if (pool.length === 0) return null;

  const rank = (raw: string) => {
    const order = [
      "openai",
      "anthropic",
      "google",
      "xai",
      "deepseek",
      "moonshot",
      "mistral",
      "meta",
    ];
    const i = order.indexOf(raw);
    return i >= 0 ? i : 50;
  };

  const sorted = [...pool].sort((a, b) => {
    const pr = rank(a.rawProvider) - rank(b.rawProvider);
    if (pr !== 0) return pr;
    const pa = a.pricing?.inputPerMTok ?? 999;
    const pb = b.pricing?.inputPerMTok ?? 999;
    return pa - pb;
  });
  return sorted[0] ?? null;
}

function isShelfCandidate(publicModel: string, name: string): boolean {
  const s = `${publicModel} ${name}`.toLowerCase();
  if (
    /embedding|whisper|tts|transcribe|moderation|realtime|dall-e|imagen|veo|sora|codex|computer-use/.test(
      s,
    )
  ) {
    return false;
  }
  if (/[:@]/.test(publicModel)) return false;
  if (/^(amazon|au|eu|us|ap|apac|global)\./i.test(publicModel)) return false;
  if (/^(anthropic|google|meta|mistral|cohere)\./i.test(publicModel)) return false;
  if (/\d{8}/.test(publicModel)) return false;
  if (/-20\d{2}-\d{2}-\d{2}/.test(publicModel)) return false;
  if (/(?:^|[-_])customtools(?:$|[-_])/i.test(publicModel) || /maas$/i.test(publicModel))
    return false;
  if (publicModel.length > 64) return false;
  return true;
}

function toListing(
  publicModel: string,
  name: string,
  offering: ModelOffering | null,
  caps: { reasoning: boolean; vision: boolean },
  routes: ModelRouteRow["routes"],
  source: ListingModel["source"],
  sellable: boolean,
): ListingModel {
  const raw = offering?.rawProvider ?? "other";
  let provider = mapProvider(raw);
  if (provider === "other") {
    provider = inferProviderFromModelId(publicModel);
  }
  return {
    publicModel,
    name,
    description: name,
    category: classifyCategory(publicModel, name, caps),
    provider,
    context: formatContext(offering?.contextWindow),
    inputPerMTok: offering?.pricing?.inputPerMTok ?? 0,
    outputPerMTok: offering?.pricing?.outputPerMTok ?? 0,
    routes,
    routed: routes.length > 0,
    sellable,
    source,
  };
}

function aliasRouteMap(): Map<string, ModelRouteRow["routes"]> {
  const map = new Map<string, ModelRouteRow["routes"]>();
  for (const row of getModelRoutes()) {
    map.set(row.publicModel, row.routes);
  }
  return map;
}

function listingMode(): "auto" | "inventory" | "catalog" {
  const m = (process.env.ROUTER_LISTING_MODE ?? "auto").toLowerCase();
  if (m === "inventory" || m === "catalog") return m;
  return "auto";
}

function fallbackFromAliases(inv: SupplyInventory | null): ListingModel[] {
  const routes = aliasRouteMap();
  const aliases = parseAliasTableJson(process.env.NEBUTRA_MODEL_ALIASES);
  const ids = listPublicModels(aliases);
  return ids.map((id) =>
    toListing(
      id,
      id,
      null,
      { reasoning: false, vision: false },
      routes.get(id) ?? [],
      "alias-fallback",
      inv ? inventoryHas(inv, id) : true,
    ),
  );
}

/**
 * 302-style shelf: only models we can sell when inventory is available.
 */
export async function getListingCatalog(): Promise<{
  models: ListingModel[];
  source: "inventory∩models.dev" | "models.dev" | "alias-fallback";
  fetchedNote: string;
  inventoryOk: boolean;
  inventorySources: readonly string[];
}> {
  const routes = aliasRouteMap();
  const aliasIds = new Set(routes.keys());
  const mode = listingMode();

  const inv = await getSupplyInventory();
  const useInventory = mode === "inventory" || (mode === "auto" && inv.ok && inv.ids.size > 0);

  try {
    const logical = await listModelsByModality("text");
    const byPublic = new Map<string, ListingModel>();

    for (const m of logical) {
      const offering = pickOffering(m);
      if (!offering) continue;
      if (!PREFERRED_RAW.has(offering.rawProvider) && !aliasIds.has(bareId(offering.id))) {
        continue;
      }

      const publicModel = bareId(offering.id);
      if (!isShelfCandidate(publicModel, m.name)) continue;

      const sellable = inv.ok
        ? inventoryHas(inv, publicModel) || inventoryHas(inv, offering.id)
        : false;

      // 302: inventory mode → only sellable (+ always allow explicit aliases later)
      if (useInventory && !sellable && !aliasIds.has(publicModel)) {
        continue;
      }

      const listing = toListing(
        publicModel,
        m.name,
        offering,
        m.capabilities,
        routes.get(publicModel) ?? [],
        "models.dev",
        sellable || aliasIds.has(publicModel),
      );

      const prev = byPublic.get(publicModel);
      if (!prev) {
        byPublic.set(publicModel, listing);
        continue;
      }
      if (listing.routed && !prev.routed) byPublic.set(publicModel, listing);
      else if (
        listing.inputPerMTok > 0 &&
        (prev.inputPerMTok <= 0 || listing.inputPerMTok < prev.inputPerMTok)
      ) {
        byPublic.set(publicModel, {
          ...listing,
          routes: prev.routes,
          routed: prev.routed,
          sellable: prev.sellable || listing.sellable,
        });
      }
    }

    // Explicit aliases always on shelf (configured SKUs)
    for (const id of aliasIds) {
      const cur = byPublic.get(id);
      if (cur) {
        byPublic.set(id, {
          ...cur,
          routes: routes.get(id) ?? cur.routes,
          routed: true,
          sellable: true,
        });
        continue;
      }
      byPublic.set(
        id,
        toListing(
          id,
          id,
          null,
          { reasoning: false, vision: false },
          routes.get(id) ?? [],
          "alias-fallback",
          true,
        ),
      );
    }

    let models = [...byPublic.values()];

    if (useInventory) {
      models = models.filter((m) => m.sellable || m.routed);
    }

    models.sort((a, b) => {
      if (a.sellable !== b.sellable) return a.sellable ? -1 : 1;
      if (a.routed !== b.routed) return a.routed ? -1 : 1;
      if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
      return a.publicModel.localeCompare(b.publicModel);
    });

    if (models.length === 0) {
      const fb = fallbackFromAliases(inv);
      return {
        models: fb,
        source: "alias-fallback",
        fetchedNote: useInventory ? "库存∩目录为空，回退 alias" : "目录为空，回退 alias",
        inventoryOk: inv.ok,
        inventorySources: inv.sources,
      };
    }

    const source = useInventory ? "inventory∩models.dev" : "models.dev";
    const invPart = inv.ok ? inv.note : "未连通供给（配置 NEW_API_* 或依赖 OpenRouter 库存）";
    const fetchedNote = useInventory
      ? `可售货架 · ${models.length} · ${invPart} · 价/上下文 models.dev`
      : `参考目录 · ${models.length} · models.dev · ${invPart}`;

    return {
      models,
      source,
      fetchedNote,
      inventoryOk: inv.ok,
      inventorySources: inv.sources,
    };
  } catch {
    const fb = fallbackFromAliases(inv);
    if (fb.length === 0) {
      const ids = [
        ...new Set(DEFAULT_ALIASES.filter((e) => e.publicModel !== "*").map((e) => e.publicModel)),
      ];
      return {
        models: ids.map((id) =>
          toListing(id, id, null, { reasoning: false, vision: false }, [], "alias-fallback", true),
        ),
        source: "alias-fallback",
        fetchedNote: "models.dev 不可达，使用内置 alias",
        inventoryOk: inv.ok,
        inventorySources: inv.sources,
      };
    }
    return {
      models: fb,
      source: "alias-fallback",
      fetchedNote: "models.dev 不可达，使用 alias 默认",
      inventoryOk: inv.ok,
      inventorySources: inv.sources,
    };
  }
}

export async function getListedModelIds(): Promise<string[]> {
  const { models } = await getListingCatalog();
  return models.map((m) => m.publicModel);
}

/** PDP lookup by public model id (url slug) */
export async function getListedModelBySlug(slug: string): Promise<ListingModel | null> {
  const decoded = decodeURIComponent(slug).trim();
  if (!decoded) return null;
  const { models } = await getListingCatalog();
  const lower = decoded.toLowerCase();
  return (
    models.find((m) => m.publicModel.toLowerCase() === lower) ??
    models.find((m) => bareId(m.publicModel).toLowerCase() === lower) ??
    null
  );
}

/** Related shelf rows for "猜你喜欢" */
export async function getRelatedListings(seed: ListingModel, limit = 6): Promise<ListingModel[]> {
  const { models } = await getListingCatalog();
  const provider = resolveListingProvider(seed);
  const sameProvider = models.filter(
    (m) => m.publicModel !== seed.publicModel && resolveListingProvider(m) === provider,
  );
  const sameCat = models.filter(
    (m) =>
      m.publicModel !== seed.publicModel &&
      m.category === seed.category &&
      resolveListingProvider(m) !== provider,
  );
  const rest = models.filter(
    (m) => m.publicModel !== seed.publicModel && !sameProvider.includes(m) && !sameCat.includes(m),
  );
  return [...sameProvider, ...sameCat, ...rest].slice(0, limit);
}
