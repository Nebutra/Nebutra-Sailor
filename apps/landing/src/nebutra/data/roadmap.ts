// @brand-exempt: the essays named below are the founder's Journal posts about
// Nebutra — narrative content, not a config value a rebrand could substitute.
// Same pattern as _about-data.ts.
import { REPO_URL } from "./repo";

/**
 * The roadmap, in the founder's nine layers (Journal: "Founder 顶层设计的九层结构").
 *
 * L1–L8 are the direction and change slowly; every line is the founder's own
 * words from "Why we are building Nebutra", never a paraphrase written for
 * this page. L9 is the execution — what landed, Now, Later — and each bet names
 * the layer it answers to, because a bet that serves no layer has no reason to be
 * on the list.
 *
 * `LANDED` is what moved out of Now. It links the work itself, not a count of
 * it: the site does not show maintenance cadence (nebutra/DESIGN.md).
 *
 * This file holds the shape — which layers, which bets, what each serves,
 * where it links. The words live in the catalogs under `roadmapPage`: en.json
 * as written in the English essay; zh-Hans and zh-Hant quote the Chinese
 * edition (为什么我们要做 Nebutra) where it says the same thing, and translate
 * plainly where it does not. Every other locale reads the English.
 */

export type LayerId = "l1" | "l2" | "l3" | "l4" | "l5" | "l6" | "l7" | "l8";

export interface Layer {
  id: LayerId;
  /**
   * Shown together, always: both names render side by side on the roadmap
   * page whatever the viewer's locale (a bilingual label, not a translation
   * choice), so the pair stays here. The inline-i18n ratchet counts it and
   * lists this file in its allowlist on purpose.
   */
  name: { en: string; zh: string };
  /** The essay gives this layer a second line (`roadmapPage.layers.<id>.also`). */
  also?: true;
}

/** Where L1–L8 are argued in full. */
export const DIRECTION_ESSAY = "/blog/why-we-build-nebutra";

export const NINE_LAYERS_ESSAY = "/blog/founder-top-design-nine-layers";

/**
 * Two essays publish their Chinese edition under a slug of its own; the rest
 * serve both languages from one slug. A Chinese reader is sent to the Chinese
 * edition directly.
 */
const ZH_EDITION: Readonly<Record<string, string>> = {
  [DIRECTION_ESSAY]: "/blog/why-we-build-nebutra-zh",
  "/blog/sleptons-project": "/blog/sleptons-project-zh",
};

export const essayHref = (href: string, zh: boolean) => (zh ? (ZH_EDITION[href] ?? href) : href);

export const LAYERS: readonly Layer[] = [
  { id: "l1", name: { zh: "本质", en: "Purpose" } },
  { id: "l2", name: { zh: "未来", en: "Future" }, also: true },
  { id: "l3", name: { zh: "原则", en: "Principles" }, also: true },
  { id: "l4", name: { zh: "战略", en: "Strategy" }, also: true },
  { id: "l5", name: { zh: "产品", en: "Product" }, also: true },
  { id: "l6", name: { zh: "用户", en: "Users" } },
  { id: "l7", name: { zh: "表达", en: "Narrative" }, also: true },
  { id: "l8", name: { zh: "身份", en: "Identity" } },
];

/**
 * Now is this month's work; Later is where the essays point. There is no
 * Next while nothing is designed-but-unstarted: an empty phase would be a
 * placeholder, not a plan.
 */
export type Horizon = "now" | "later";

export const HORIZONS: readonly Horizon[] = ["now", "later"];

export interface Bet {
  /** Key under `roadmapPage.bets` (title, what). */
  id: string;
  horizon: Horizon;
  /** The layer this bet answers to. */
  serves: LayerId;
  href?: string;
}

export const BETS = [
  { id: "studio", horizon: "now", serves: "l5", href: "/sailor/studio" },
  { id: "template", horizon: "now", serves: "l1" },
  { id: "wallet", horizon: "now", serves: "l2" },
  { id: "ecosystem", horizon: "later", serves: "l2" },
  { id: "teams", horizon: "later", serves: "l6", href: "/blog/sleptons-project" },
] as const satisfies readonly Bet[];

export type BetId = (typeof BETS)[number]["id"];

export interface Landed {
  /** Key under `roadmapPage.landed.items`. */
  id: string;
  /** YYYY-MM */
  month: string;
  serves: LayerId;
  /** Pull requests on the Sailor repository. */
  prs: readonly number[];
}

/** Oldest first: the timeline reads down, from what landed to what comes next. */
export const LANDED = [
  { id: "open", month: "2026-08", serves: "l4", prs: [450] },
  { id: "kuanlan", month: "2026-09", serves: "l6", prs: [469, 523, 533] },
  { id: "router", month: "2026-09", serves: "l4", prs: [545, 552] },
  { id: "tokens", month: "2026-09", serves: "l8", prs: [629, 634] },
  { id: "database", month: "2026-09", serves: "l3", prs: [640] },
  { id: "payments", month: "2026-09", serves: "l2", prs: [650, 654] },
  { id: "site", month: "2026-09", serves: "l7", prs: [664] },
  { id: "status", month: "2026-09", serves: "l3", prs: [672, 674] },
] as const satisfies readonly Landed[];

export type LandedId = (typeof LANDED)[number]["id"];

export const prUrl = (n: number) => `${REPO_URL}/pull/${n}`;
