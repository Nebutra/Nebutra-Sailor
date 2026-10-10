import { brand } from "@nebutra/brand/metadata";
import type { LayerId } from "./roadmap";

/**
 * What Nebutra offers, and the layer of the founder's nine each one answers to.
 *
 * Two businesses (owner, 2026-10-10): Sailor, the platform, and Consulting,
 * enterprise AI product delivery and going global. KCQ is a product incubated
 * on Sailor, shown smaller, as proof that Sailor carries a live product. The
 * other products (Router, Forge, Typelens, PARA…) are in the footer's "More".
 *
 * The nine layers are the decision framework: every offering names the layers
 * it answers to, and /about lists the layers with what answers to each. The
 * words live in the catalogs (`sitePages.about.layers`, `sitePages.home.offer`).
 */

/** L1–L8 come from the roadmap's layers; L9 is the execution, which moves weekly. */
export type DecisionLayer = LayerId | "l9";

export const DECISION_LAYERS: readonly DecisionLayer[] = [
  "l1",
  "l2",
  "l3",
  "l4",
  "l5",
  "l6",
  "l7",
  "l8",
  "l9",
];

export type OfferingId = "sailor" | "consulting" | "kcq";

export interface Offering {
  id: OfferingId;
  /** A business, or a product incubated on Sailor. */
  kind: "business" | "incubated";
  href: string;
  serves: readonly DecisionLayer[];
}

export const KCQ_SITE = `https://kcq.${brand.domains.landing}`;

export const OFFERINGS: readonly Offering[] = [
  { id: "sailor", kind: "business", href: "/sailor", serves: ["l1", "l3", "l5"] },
  { id: "consulting", kind: "business", href: "/consulting", serves: ["l2", "l4", "l6"] },
  { id: "kcq", kind: "incubated", href: KCQ_SITE, serves: ["l5", "l6"] },
];

export const offering = (id: OfferingId): Offering => {
  const o = OFFERINGS.find((x) => x.id === id);
  if (!o) throw new Error(`unknown offering ${id}`);
  return o;
};

/** What answers to a layer: the offerings, plus the Journal for L7 and the roadmap for L9. */
export const answersTo = (layer: DecisionLayer): readonly OfferingId[] =>
  OFFERINGS.filter((o) => o.serves.includes(layer)).map((o) => o.id);
