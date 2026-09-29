import { brand } from "@nebutra/brand/metadata";

/**
 * The products growing on the platform. The site leads with ideas; these are
 * listed plainly on the Building page, not shown off as a portfolio.
 *
 * Each `line` is the one the product itself leads with.
 */
export type ProductCategory = "Creative" | "Infrastructure" | "Developer" | "Design";

export interface Product {
  id: string;
  name: string;
  line: string;
  what: string;
  /** `what` in Simplified Chinese. */
  whatZh: string;
  category: ProductCategory;
  href: string;
  domain: string;
}

const at = (id: string) => `${id}.${brand.domains.landing}`;

export const PRODUCTS: readonly Product[] = [
  {
    id: "kuanlan",
    name: "Kuanlan 观澜",
    line: "观你所见，澜起于心。",
    what: "An AI studio for images, wardrobe and moments.",
    whatZh: "图像、穿搭与瞬间的 AI 工作室。",
    category: "Creative",
    href: `https://${at("kuanlan")}`,
    domain: at("kuanlan"),
  },
  {
    id: "router",
    name: "Router",
    line: "Match every need with the right AI.",
    what: "One market and one API for models, apps and tools.",
    whatZh: "模型、应用和工具的一个市场、一个 API。",
    category: "Infrastructure",
    href: `https://${at("router")}`,
    domain: at("router"),
  },
  {
    id: "typelens",
    name: "Typelens",
    line: "Real-world pairings for designers and design agents.",
    what: "519 works, indexed by typeface, mood and medium.",
    whatZh: "519 件作品，按字体、情绪和媒介索引。",
    category: "Design",
    href: `https://${at("typelens")}`,
    domain: at("typelens"),
  },
  {
    id: "forge",
    name: "Forge",
    line: "Swiss-army knife for online tools.",
    what: "184 tools, in the browser or as API / MCP.",
    whatZh: "184 个工具，浏览器里直接用，也能走 API / MCP。",
    category: "Developer",
    href: `https://${at("forge")}`,
    domain: at("forge"),
  },
  {
    id: "para",
    name: "Para",
    line: "What are you making?",
    what: "A creative canvas for ideas, objects and AI.",
    whatZh: "承载想法、物件与 AI 的创作画布。",
    category: "Creative",
    href: `https://${at("para")}`,
    domain: at("para"),
  },
];

export const CATEGORIES: readonly ProductCategory[] = [
  "Creative",
  "Infrastructure",
  "Developer",
  "Design",
];
