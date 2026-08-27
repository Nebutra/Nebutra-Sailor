/**
 * @nebutra/brand — Microcopy SSOT
 *
 * Typed projection of the Nebutra Microcopy System methodology bible
 * (docs/microcopy/nebutra-microcopy-system.md).
 *
 * This module is the machine-readable SSOT for §8.2 (NebutraMicrocopy type),
 * §8.3 (Milestone Copy Pack, 14 entries), and §6.7 (Easter Egg Registry).
 *
 * IMPORTANT: Do NOT hand-edit copy strings here without re-reading the bible.
 * The §8.3 table is the authority. Run `pnpm --filter @nebutra/brand test` to
 * verify invariants after any change.
 *
 * MC-H2: `act` carries only the three-act model ('starting'|'building'|'growing').
 * Failure & Milestone are cross-cutting throughlines, not a 4th act; they are
 * modelled with the optional `throughline` field. 'First Reset' has act:'starting'
 * (it can occur at any phase) + throughline:'failure'.
 *
 * MC-H4: locale is resolved via locale-keyed maps (MILESTONE_COPY_PACK entries
 * carry a `copy` record keyed by locale, not one row per (id, locale)).
 */

import easterEggRegistryData from "./easter-egg-registry.json";

// ---------------------------------------------------------------------------
// Locale
// ---------------------------------------------------------------------------

export type SupportedLocale = "zh-CN" | "en-US";

// ---------------------------------------------------------------------------
// NebutraMicrocopy type — verbatim §8.2 + MC-H2/MC-H3 corrections
// ---------------------------------------------------------------------------

/**
 * Structured microcopy asset as defined in §8.2 of the microcopy system bible.
 *
 * MC-H2 fix: `act` is the three-act model (starting/building/growing).
 * Failure and Milestone are cross-cutting states modelled via `throughline`.
 * MC-H3: all §8.2 fields are present including id, locale, secondaryCopy?,
 * ctaCopy?, and surface includes 'graduation'.
 */
export type NebutraMicrocopy = {
  id: string;
  locale: SupportedLocale | string; // scalar: the locale this entry targets

  /** Three-act model (user-visible). Failure/Milestone use `throughline`. */
  act: "starting" | "building" | "growing";

  /**
   * Cross-cutting states that span all acts (§4.4 纵贯线).
   * Failure and Milestone are not acts; they appear at any act.
   */
  throughline?: "failure" | "milestone";

  /** Nine-stage production taxonomy (§4.3). */
  stage:
    | "imagining"
    | "validating"
    | "assembling"
    | "building"
    | "shipping"
    | "operating"
    | "growing"
    | "scaling"
    | "graduating";

  /** Product surface where the copy appears. MC-H3: includes 'graduation'. */
  surface:
    | "onboarding"
    | "empty_state"
    | "success_state"
    | "failure_state"
    | "milestone"
    | "team"
    | "revenue"
    | "growth"
    | "deployment"
    | "graduation"
    | "tool_recommendation"
    | "warning";

  /** Five voice registers (§2.4). */
  voiceRegister: "companion" | "mentor" | "historian" | "operator" | "graduation";

  /** User's emotional state at this moment. */
  userEmotion: "uncertain" | "excited" | "stuck" | "proud" | "anxious" | "focused" | "ready";

  /** Seven cultural motifs (§3.2). */
  culturalMotif:
    | "small_room"
    | "first_believer"
    | "the_table"
    | "survival_first"
    | "ship_it"
    | "honest_restart"
    | "new_garage";

  /** Three-layer easter egg classification (§6.1). */
  easterEggLayer: "functional" | "metaphor" | "echo";

  primaryCopy: string;
  secondaryCopy?: string;
  ctaCopy?: string;

  variables?: Array<
    "{company}" | "{project}" | "{tool}" | "{member}" | "{user_count}" | "{revenue}" | "{stage}"
  >;

  riskLevel: "low" | "medium" | "high";

  /**
   * Echo-layer REQUIRED (§8.2): the real-world story / cultural inspiration
   * behind the second layer. Must be non-empty for any entry with
   * easterEggLayer === 'echo'.
   */
  sourceInspiration?: string;

  notes?: string;
};

// ---------------------------------------------------------------------------
// MilestoneId
// ---------------------------------------------------------------------------

export type MilestoneId =
  | "first_room"
  | "first_folder"
  | "first_table"
  | "first_signal"
  | "first_ship"
  | "first_believer"
  | "first_revenue"
  | "first_return"
  | "first_team"
  | "first_crowd"
  | "first_reset"
  | "first_public"
  | "first_demo"
  | "graduation";

// ---------------------------------------------------------------------------
// MilestoneCopyEntry — bilingual via locale-keyed map (MC-H4)
// ---------------------------------------------------------------------------

/**
 * A single Milestone Copy Pack entry keyed by locale.
 *
 * MC-H4: bilingual copy is stored as a locale-keyed map so a single entry
 * covers both zh-CN and en-US without duplicating the metadata fields.
 * getMilestoneCopy(id, locale) slices out the requested locale.
 */
export type MilestoneCopyEntry = {
  id: MilestoneId;
  /** Locale-keyed copy strings. Each locale has primary, optional secondary/cta. */
  copy: Readonly<
    Record<
      SupportedLocale,
      {
        primary: string;
        secondary?: string;
        cta?: string;
      }
    >
  >;
  /** Three-act model; 'first_reset' is 'starting' + throughline:'failure'. */
  act: "starting" | "building" | "growing";
  throughline?: "failure" | "milestone";
  stage: NebutraMicrocopy["stage"];
  surface: NebutraMicrocopy["surface"];
  voiceRegister: NebutraMicrocopy["voiceRegister"];
  culturalMotif: NebutraMicrocopy["culturalMotif"];
  easterEggLayer: NebutraMicrocopy["easterEggLayer"];
  riskLevel: NebutraMicrocopy["riskLevel"];
  sourceInspiration?: string;
};

// ---------------------------------------------------------------------------
// MILESTONE_COPY_PACK — 14 §8.3 entries (typed bilingual data)
// ---------------------------------------------------------------------------

/**
 * The 14-entry Milestone Copy Pack, typed bilingual data directly from §8.3.
 *
 * These are the canonical typed objects; the i18n catalog
 * (packages/platform/i18n/locales/{en,zh}.json under startupOs.milestone.*)
 * mirrors these strings for runtime next-intl delivery.
 *
 * "First Reset" has act:'starting' because a pivot can occur at any stage in
 * the first act — not '纵贯' (which is not a valid act value).
 */
export const MILESTONE_COPY_PACK: readonly MilestoneCopyEntry[] = [
  {
    id: "first_room",
    copy: {
      "zh-CN": { primary: "第一间房间已经准备好。" },
      "en-US": { primary: "The first room is ready." },
    },
    act: "starting",
    throughline: "milestone",
    stage: "imagining",
    surface: "milestone",
    voiceRegister: "historian",
    culturalMotif: "small_room",
    easterEggLayer: "metaphor",
    riskLevel: "low",
  },
  {
    id: "first_folder",
    copy: {
      "zh-CN": { primary: "许多公司，最初只是一个文件夹。" },
      "en-US": { primary: "Many companies begin as a folder." },
    },
    act: "starting",
    throughline: "milestone",
    stage: "imagining",
    surface: "milestone",
    voiceRegister: "companion",
    culturalMotif: "small_room",
    easterEggLayer: "metaphor",
    riskLevel: "low",
  },
  {
    id: "first_table",
    copy: {
      "zh-CN": { primary: "第一张桌子有了第二个人。" },
      "en-US": { primary: "The first table has a second seat." },
    },
    act: "starting",
    throughline: "milestone",
    stage: "assembling",
    surface: "milestone",
    voiceRegister: "companion",
    culturalMotif: "the_table",
    easterEggLayer: "metaphor",
    riskLevel: "low",
  },
  {
    id: "first_signal",
    copy: {
      "zh-CN": { primary: "真实世界开始说话了。" },
      "en-US": { primary: "The real world has started talking." },
    },
    act: "starting",
    throughline: "milestone",
    stage: "validating",
    surface: "milestone",
    voiceRegister: "operator",
    culturalMotif: "ship_it",
    easterEggLayer: "metaphor",
    riskLevel: "low",
  },
  {
    id: "first_ship",
    copy: {
      "zh-CN": { primary: "世界第一次看见它。" },
      "en-US": { primary: "The world sees it for the first time." },
    },
    act: "building",
    throughline: "milestone",
    stage: "shipping",
    surface: "milestone",
    voiceRegister: "companion",
    culturalMotif: "ship_it",
    easterEggLayer: "metaphor",
    riskLevel: "low",
  },
  {
    id: "first_believer",
    copy: {
      "zh-CN": { primary: "从今天起，你不再只为自己开发。" },
      "en-US": {
        primary: "From today, you are no longer building only for yourself.",
      },
    },
    act: "building",
    throughline: "milestone",
    stage: "shipping",
    surface: "milestone",
    voiceRegister: "historian",
    culturalMotif: "first_believer",
    easterEggLayer: "metaphor",
    riskLevel: "low",
  },
  {
    id: "first_revenue",
    copy: {
      "zh-CN": { primary: "梦想开始拥有现金流。" },
      "en-US": { primary: "The dream has cash flow now." },
    },
    act: "building",
    throughline: "milestone",
    stage: "operating",
    surface: "milestone",
    voiceRegister: "operator",
    culturalMotif: "survival_first",
    easterEggLayer: "metaphor",
    riskLevel: "low",
  },
  {
    id: "first_return",
    copy: {
      "zh-CN": { primary: "回来，比来过更重要。" },
      "en-US": { primary: "Returning matters more than visiting." },
    },
    act: "growing",
    throughline: "milestone",
    stage: "growing",
    surface: "milestone",
    voiceRegister: "operator",
    culturalMotif: "first_believer",
    easterEggLayer: "metaphor",
    riskLevel: "low",
  },
  {
    id: "first_team",
    copy: {
      "zh-CN": { primary: "三个人，局就开始成形。" },
      "en-US": { primary: "Three people can begin to form a company." },
    },
    act: "starting",
    throughline: "milestone",
    stage: "assembling",
    surface: "milestone",
    voiceRegister: "companion",
    culturalMotif: "the_table",
    easterEggLayer: "metaphor",
    riskLevel: "low",
  },
  {
    id: "first_crowd",
    copy: {
      "zh-CN": { primary: "第一张桌子坐不下了。" },
      "en-US": { primary: "The first table is getting crowded." },
    },
    act: "growing",
    throughline: "milestone",
    stage: "scaling",
    surface: "milestone",
    voiceRegister: "historian",
    culturalMotif: "the_table",
    easterEggLayer: "echo",
    riskLevel: "low",
    sourceInspiration:
      "回响第一张桌子 (first_table) — 从第一个同伴到桌子坐满人，是从二人对话到真正组织的跃迁；the same table that once seated two now cannot hold the team",
  },
  {
    id: "first_reset",
    // MC-H2: First Reset's real act is 'starting' (a pivot sends you back to start).
    // It is NOT act:'纵贯'. throughline:'failure' captures the cross-cutting nature.
    act: "starting",
    throughline: "failure",
    copy: {
      "zh-CN": { primary: "重启不是失败，是更诚实的开始。" },
      "en-US": { primary: "A restart is a more honest beginning." },
    },
    stage: "imagining",
    surface: "failure_state",
    voiceRegister: "mentor",
    culturalMotif: "honest_restart",
    easterEggLayer: "metaphor",
    riskLevel: "low",
  },
  {
    id: "first_public",
    copy: {
      "zh-CN": { primary: "把一部分未来，交给世界。" },
      "en-US": { primary: "Put a piece of the future in public." },
    },
    act: "growing",
    throughline: "milestone",
    stage: "growing",
    surface: "milestone",
    voiceRegister: "historian",
    culturalMotif: "new_garage",
    easterEggLayer: "metaphor",
    riskLevel: "low",
  },
  {
    id: "first_demo",
    copy: {
      "zh-CN": { primary: "这不是展示，是接受检验。" },
      "en-US": { primary: "This is not a show. It is a test." },
    },
    act: "building",
    throughline: "milestone",
    stage: "shipping",
    surface: "milestone",
    voiceRegister: "companion",
    culturalMotif: "ship_it",
    easterEggLayer: "metaphor",
    riskLevel: "low",
  },
  {
    id: "graduation",
    copy: {
      "zh-CN": { primary: "你出师了。下一程需要更强的装备。" },
      "en-US": {
        primary: "You've outgrown the basics. The road ahead needs stronger tools.",
      },
    },
    act: "growing",
    throughline: "milestone",
    stage: "graduating",
    surface: "graduation",
    voiceRegister: "graduation",
    culturalMotif: "small_room",
    easterEggLayer: "metaphor",
    riskLevel: "low",
  },
] as const;

// ---------------------------------------------------------------------------
// getMilestoneCopy — locale lookup helper
// ---------------------------------------------------------------------------

/**
 * Returns the copy strings for a given milestone and locale.
 *
 * @param id - The MilestoneId to look up (e.g. 'first_folder')
 * @param locale - The locale to retrieve ('zh-CN' or 'en-US')
 * @returns Object with primary string, optional secondary and cta.
 *
 * @example
 * getMilestoneCopy("first_folder", "zh-CN").primary
 * // => "许多公司，最初只是一个文件夹。"
 */
export function getMilestoneCopy(
  id: MilestoneId,
  locale: SupportedLocale,
): { primary: string; secondary?: string; cta?: string } {
  const entry = MILESTONE_COPY_PACK.find((e) => e.id === id);
  if (!entry) {
    throw new Error(`getMilestoneCopy: unknown MilestoneId "${id}"`);
  }
  const localeCopy = entry.copy[locale];
  if (!localeCopy) {
    throw new Error(`getMilestoneCopy: locale "${locale}" not found for milestone "${id}"`);
  }
  return {
    primary: localeCopy.primary,
    ...(localeCopy.secondary !== undefined ? { secondary: localeCopy.secondary } : {}),
    ...(localeCopy.cta !== undefined ? { cta: localeCopy.cta } : {}),
  };
}

// ---------------------------------------------------------------------------
// EasterEggEntry — §6.7 schema (MC-M1: echo-layer only)
// ---------------------------------------------------------------------------

/**
 * Easter Egg Registry entry. Per §6.7 and MC-M1, only echo-layer彩蛋 are
 * registered here — functional and metaphor layers do not require防油/防侵权
 * tracking. Echo-layer entries MUST have a non-empty secondaryCopy and
 * sourceInspiration (the "second layer" cultural anchor).
 */
export type EasterEggEntry = {
  id: string;
  /** MC-M1: only 'echo' entries go in the registry. */
  layer: "echo";
  primaryCopy: string;
  /** Required for echo-layer: the second layer (同行 visible). */
  secondaryCopy: string;
  /**
   * Required for echo-layer (§8.2 "回响层必填"): the real-world story /
   * cultural inspiration that anchors the second layer.
   * Used by防重防油 check: same sourceInspiration must not appear in
   * adjacent surfaces.
   */
  sourceInspiration: string;
  usedInSurface: NebutraMicrocopy["surface"];
  riskLevel: "low" | "medium" | "high";
};

// ---------------------------------------------------------------------------
// EASTER_EGG_REGISTRY — seeded with §6.3 canonical echo examples
// ---------------------------------------------------------------------------

/**
 * Registry of echo-layer easter eggs as typed data (§6.7).
 * Seeded with the four canonical §6.3 examples.
 *
 * Add new echo-layer entries here when writing new回响层彩蛋.
 * Each entry's sourceInspiration must be unique within the registry (防重).
 */
export const EASTER_EGG_REGISTRY: readonly EasterEggEntry[] =
  easterEggRegistryData as EasterEggEntry[];
