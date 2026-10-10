import { brand } from "@nebutra/brand/metadata";
import type { StaticImageData } from "next/image";
import acme from "./shots/acme.webp";
import forge from "./shots/forge.webp";
import kcq from "./shots/kcq.webp";
import router from "./shots/router.webp";
import typelens from "./shots/typelens.webp";

/**
 * What the investors page shows of the platform: live sites only.
 *
 * Each shot is a capture of the production site at 1440×900, DPR 2, taken on
 * 2026-10-09 and stored next to this file so the page needs no CDN upload.
 * Re-capture when a product's front page changes; never stage a mock here.
 * The `copy` key is the product's line under `sitePages.investors.products`.
 */
export interface ShowcaseItem {
  id: "router" | "forge" | "typelens" | "kcq";
  name: string;
  domain: string;
  href: string;
  shot: StaticImageData;
}

const at = (sub: string) => `${sub}.${brand.domains.landing}`;
const live = (sub: string, name: string, shot: StaticImageData, id: ShowcaseItem["id"]) => ({
  id,
  name,
  domain: at(sub),
  href: `https://${at(sub)}`,
  shot,
});

export const SHOWCASE: readonly ShowcaseItem[] = [
  live("router", "Router", router, "router"),
  live("forge", "Forge", forge, "forge"),
  live("typelens", "Typelens", typelens, "typelens"),
  live("kcq", "KCQ", kcq, "kcq"),
];

/** The deployed Sailor template — what `npx create-sailor` produces, live. */
export const ACME_SHOT = acme;
