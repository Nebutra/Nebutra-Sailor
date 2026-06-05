import type { ContextFieldDefinition, LayerId, Stability } from "./model";

/**
 * Company Context registry — the nine-layer "tower" (九层塔) expressed as DATA.
 *
 * Layer behavior NEVER code-branches on a layer id; engines read this registry.
 * The nine layers are fixed (order 1..9, bottom L1 essence -> top L9 execution),
 * while the FIELDS inside each layer are merely SEED defaults: agents/users may
 * add or delete fields at runtime. Keeping the canon as a frozen data table (not
 * branching code) is what lets the tower stay AI-native and extensible.
 */

/** Static metadata for one layer of the tower (no values, no field state). */
export interface ContextLayerMeta {
  readonly id: LayerId;
  /** Stable english slug, e.g. "essence". */
  readonly key: string;
  /** Chinese display label, e.g. "本质". */
  readonly zh: string;
  /** Expected change cadence, slowest -> fastest. */
  readonly stability: Stability;
  /** The guiding question this layer answers, e.g. "为何存在". */
  readonly q: string;
  /** 1-based position, bottom (1) -> top (9). */
  readonly order: number;
}

/**
 * The nine canonical layers, bottom -> top. Frozen: this is the single source of
 * truth for layer order, stability cadence, and the question each layer answers.
 */
export const LAYER_REGISTRY: readonly ContextLayerMeta[] = Object.freeze([
  { id: "L1", key: "essence", zh: "本质", stability: "century", q: "为何存在", order: 1 },
  { id: "L2", key: "future", zh: "未来", stability: "decades", q: "去哪里", order: 2 },
  { id: "L3", key: "principles", zh: "原则", stability: "years", q: "怎么做事", order: 3 },
  { id: "L4", key: "strategy", zh: "战略", stability: "years_1_3", q: "怎么赢", order: 4 },
  { id: "L5", key: "product", zh: "产品", stability: "quarter", q: "造什么", order: 5 },
  { id: "L6", key: "users", zh: "用户", stability: "half_year", q: "服务谁", order: 6 },
  { id: "L7", key: "narrative", zh: "表达", stability: "years_1_2", q: "怎么讲", order: 7 },
  { id: "L8", key: "identity", zh: "身份", stability: "years_5_plus", q: "是谁的化身", order: 8 },
  { id: "L9", key: "execution", zh: "执行", stability: "weekly", q: "接下来干什么", order: 9 },
] as const);

/** Small helper to keep each seed-field literal terse and consistently shaped. */
function field(
  key: string,
  label: string,
  kind: ContextFieldDefinition["kind"],
  required = false,
): ContextFieldDefinition {
  return { key, label, kind, required };
}

/**
 * Seed (default) fields per layer. Extensible at runtime — these are only the
 * fields the tower ships with. Each layer's array is frozen so the registry
 * cannot be mutated in place; runtime additions produce new arrays in the store.
 */
export const SEED_FIELDS: Readonly<Record<LayerId, readonly ContextFieldDefinition[]>> =
  Object.freeze({
    L1: Object.freeze([
      field("mission", "Mission", "line", true),
      field("why", "Why we exist", "text"),
      field("technical_belief", "Technical belief", "text"),
    ]),
    L2: Object.freeze([
      field("vision", "Vision", "line"),
      field("bhag", "Big hairy audacious goal", "structured"),
      field("vivid_description", "Vivid description", "text"),
    ]),
    L3: Object.freeze([
      field("values", "Values", "list"),
      field("operating_principles", "Operating principles", "list"),
      field("safety_tenets", "Safety tenets", "list"),
    ]),
    L4: Object.freeze([
      field("positioning", "Positioning", "structured", true),
      field("category", "Category", "line"),
      field("wedge", "Wedge", "line"),
      field("moat", "Moat", "text"),
      field("pov", "Point of view", "text"),
    ]),
    L5: Object.freeze([
      field("jtbd", "Jobs to be done", "structured", true),
      field("value_proposition", "Value proposition", "text"),
      field("pr_faq", "PR FAQ", "text"),
    ]),
    L6: Object.freeze([
      field("icp", "Ideal customer profile", "structured", true),
      field("personas", "Personas", "list"),
      field("trigger_event", "Trigger event", "line"),
      field("market", "Market", "line"),
    ]),
    L7: Object.freeze([
      field("narrative", "Narrative", "text"),
      field("manifesto", "Manifesto", "text"),
      field("tagline", "Tagline", "line"),
      field("messaging", "Messaging", "list"),
    ]),
    L8: Object.freeze([
      field("name", "Company name", "line", true),
      field("logo", "Logo", "asset"),
      field("colors", "Colors", "asset"),
      field("fonts", "Fonts", "asset"),
      field("images", "Images", "asset"),
      field("design_guide", "Design guide", "text"),
      field("brand_guide", "Brand guide", "text"),
      field("archetype", "Archetype", "structured"),
      field("tone", "Tone", "list"),
    ]),
    L9: Object.freeze([
      field("okrs", "OKRs", "structured"),
      field("roadmap", "Roadmap", "structured"),
      field("nsm", "North-star metric", "line"),
      field("bets", "Bets", "list"),
      field("live_runs", "Live runs", "link"),
    ]),
  });

/** Index for O(1) `getLayerMeta` lookups without re-scanning the registry. */
const LAYER_META_BY_ID: Readonly<Record<LayerId, ContextLayerMeta>> = Object.freeze(
  Object.fromEntries(LAYER_REGISTRY.map((layer) => [layer.id, layer])) as Record<
    LayerId,
    ContextLayerMeta
  >,
);

/** Return the static metadata for a layer id (order, stability, zh, question). */
export function getLayerMeta(id: LayerId): ContextLayerMeta {
  return LAYER_META_BY_ID[id];
}

/** Return the frozen seed-field definitions for a layer id. */
export function getSeedFields(id: LayerId): readonly ContextFieldDefinition[] {
  return SEED_FIELDS[id];
}
