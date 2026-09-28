import { REPO_URL } from "./repo";

/**
 * The roadmap, in the founder's nine layers (Journal: "Founder 顶层设计的九层结构").
 *
 * L1–L8 are the direction and change slowly; every line is the founder's own
 * words from the Journal, never a paraphrase written for this page. L9 is the
 * execution — Now, Next, Later — and each bet names the layer it answers to,
 * because a bet that serves no layer has no reason to be on the list.
 *
 * `LANDED` is what moved out of Now. It links the work itself, not a count of
 * it: the site does not show maintenance cadence (nebutra/DESIGN.md).
 */

export type LayerId = "l1" | "l2" | "l3" | "l4" | "l5" | "l6" | "l7" | "l8";

export interface Layer {
  id: LayerId;
  name: { en: string; zh: string };
  /** The line, verbatim from the essay. */
  line: string;
  /** A second line from the same essay, when the first needs it. */
  also?: string;
}

/** Where L1–L8 are argued in full. */
export const DIRECTION_ESSAY = {
  title: "Why we are building Nebutra",
  href: "/blog/why-we-build-nebutra",
} as const;

export const NINE_LAYERS_ESSAY = "/blog/founder-top-design-nine-layers";

export const LAYERS: readonly Layer[] = [
  {
    id: "l1",
    name: { en: "Purpose", zh: "本质" },
    line: "We are building a place where creating a company no longer has to be impossibly hard.",
  },
  {
    id: "l2",
    name: { en: "Future", zh: "未来" },
    line: "The deeper shift is that the threshold for founding a company is being reset.",
    also: "Nebutra wants to lower that threshold to the point where an ordinary person with an idea and execution energy can build.",
  },
  {
    id: "l3",
    name: { en: "Principles", zh: "原则" },
    line: "Good architecture means you can go far.",
    also: "We are not challenging existing SaaS products. We are not challenging existing startup workflows.",
  },
  {
    id: "l4",
    name: { en: "Strategy", zh: "战略" },
    line: "Nebutra is the central nervous system that makes all of those organs act toward the same purpose.",
    also: "The orchestration layer says: we make your tools get used more often.",
  },
  {
    id: "l5",
    name: { en: "Product", zh: "产品" },
    line: "We build Nebutra around Plays, tactical workflows that cover complete sub-processes in the startup lifecycle, with clear inputs and outputs.",
    also: "Build that foundation once, and each Play becomes a module growing from the same skeleton.",
  },
  {
    id: "l6",
    name: { en: "Users", zh: "用户" },
    line: "They have real domain knowledge, market instinct, and execution energy. But they are not staff-level engineers, ten-year product leaders, or senior growth operators.",
  },
  {
    id: "l7",
    name: { en: "Narrative", zh: "表达" },
    line: "Nebutra: where chaos becomes a company.",
    also: "We call what Nebutra is building the Generative Company: a company whose media-ready artifacts are coherently generated from one agent and one context.",
  },
  {
    id: "l8",
    name: { en: "Identity", zh: "身份" },
    line: "Nurture the nebula into an ultra future.",
  },
];

export type Horizon = "now" | "next" | "later";

export const HORIZONS: readonly { id: Horizon; en: string; zh: string; is: string }[] = [
  { id: "now", en: "Now", zh: "正在做", is: "In the repository this month." },
  { id: "next", en: "Next", zh: "接下来", is: "Designed, not started." },
  { id: "later", en: "Later", zh: "更远", is: "Where the essays point." },
];

export interface Bet {
  horizon: Horizon;
  title: string;
  what: string;
  /** The layer this bet answers to. */
  serves: LayerId;
  href?: string;
}

export const BETS: readonly Bet[] = [
  {
    horizon: "now",
    title: "Your site, from Sailor Studio",
    what: "Pick a look in Studio; the site a new project starts as wears it, deployed, and follows when you change your mind.",
    serves: "l5",
    href: "/sailor/studio",
  },
  {
    horizon: "now",
    title: "One command to make the template yours",
    what: "Name, domain and scope set once; every package, email and page follows.",
    serves: "l1",
  },
  {
    horizon: "now",
    title: "A balance per product",
    what: "Each product on the platform keeps its own wallet and its own offers, paid by card or, in mainland China, WeChat Pay and Alipay.",
    serves: "l2",
  },
  {
    horizon: "next",
    title: "The first Play: a 60-second brand film",
    what: "One sentence describing an idea in; a complete brand system and a launch film out, all from one context.",
    serves: "l7",
    href: DIRECTION_ESSAY.href,
  },
  {
    horizon: "next",
    title: "The OS underneath every Play",
    what: "A local daemon, a semantic file system, an agent process control protocol, and state you can roll back.",
    serves: "l3",
  },
  {
    horizon: "next",
    title: "Sleptons Radar",
    what: "Find the builders ordinary search misses — the first step of a network where people, ideas and capital meet.",
    serves: "l4",
    href: "/blog/sleptons-project",
  },
  {
    horizon: "later",
    title: "Plays along the whole path",
    what: "From idea to launchable MVP, from MVP to customer discovery loops, and on toward a company.",
    serves: "l5",
  },
  {
    horizon: "later",
    title: "From tool to ecosystem",
    what: "In the short term, Nebutra is a tool. In the medium term, it is an ecosystem. In the long term, it is a redefinition.",
    serves: "l2",
  },
  {
    horizon: "later",
    title: "Teams, then companies",
    what: "Sleptons' long route: year one is people and creativity, year two is teams, year three is companies.",
    serves: "l6",
    href: "/blog/sleptons-project",
  },
];

export interface Landed {
  /** YYYY-MM */
  month: string;
  title: string;
  serves: LayerId;
  /** Pull requests on the Sailor repository. */
  prs: readonly number[];
}

export const LANDED: readonly Landed[] = [
  {
    month: "2026-09",
    title: "nebutra.com rebuilt around the Journal; Sailor Studio with presets; one UI catalog",
    serves: "l7",
    prs: [664],
  },
  {
    month: "2026-09",
    title: "A status page on its own core, with email subscriptions",
    serves: "l3",
    prs: [672, 674],
  },
  {
    month: "2026-09",
    title: "Payment orders, a card rail, and a balance per product",
    serves: "l2",
    prs: [650, 654],
  },
  {
    month: "2026-09",
    title: "One database source: row-level security generated, deploys migrate first",
    serves: "l3",
    prs: [640],
  },
  {
    month: "2026-09",
    title: "One token source and the House design language",
    serves: "l8",
    prs: [629, 634],
  },
  {
    month: "2026-09",
    title: "Router: one key, every protocol, and a priced ledger",
    serves: "l4",
    prs: [545, 552],
  },
  {
    month: "2026-09",
    title: "Kuanlan 观澜 on the platform: pay before a shoot, consent before a face",
    serves: "l6",
    prs: [469, 523, 533],
  },
  {
    month: "2026-08",
    title: "The open platform at open.nebutra.com",
    serves: "l4",
    prs: [450],
  },
];

export const prUrl = (n: number) => `${REPO_URL}/pull/${n}`;
