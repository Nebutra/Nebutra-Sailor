export type BlogSource = "sanity" | "fallback";
export type BlogLanguage = "en" | "zh";

export type BlogAuthor = {
  name?: string | null;
  image?: unknown;
  bio?: unknown;
};

/**
 * A child of a text block.
 *
 * Usually a span, but Portable Text also allows inline objects here — Nebutra
 * uses `inlineBadge` and `entityChip` — so `_type` is a free string and the
 * inline-object fields are optional siblings of `text`. Consumers must key off
 * `_type` rather than assuming `text` exists.
 */
export type PortableTextSpan = {
  _type?: string;
  _key?: string;
  text?: string;
  marks?: string[];
  /** entityChip */
  name?: string | null;
  href?: string | null;
  logo?: PortableTextImage | null;
};

/**
 * One entry inside a block's `items` array.
 *
 * Several blocks share the array name — `ctaBlock`, `statGrid`, `keyTakeaways`,
 * `timelineBlock` and `faqBlock` all use `items` — so the fields are unioned
 * here rather than split into per-block types. Every field is optional; the
 * owning block decides which ones it reads.
 */
export type PortableTextBlockItem = {
  _key?: string;
  answer?: string | null;
  body?: string | null;
  caption?: string | null;
  label?: string | null;
  /** Timeline: the year, quarter or version in the left margin. */
  marker?: string | null;
  question?: string | null;
  /** Key takeaway line. */
  text?: string | null;
  title?: string | null;
  value?: string | null;
};

export type PortableTextChartPoint = {
  _key?: string;
  /** Formatted string shown to readers, when it differs from the raw value. */
  display?: string | null;
  label?: string | null;
  value?: number | null;
};

export type PortableTextLink = {
  _key?: string;
  href?: string | null;
  label?: string | null;
};

export type PortableTextStep = {
  _key?: string;
  body?: string | null;
  title?: string | null;
};

export type PortableTextBlock = {
  _type: string;
  _key?: string;
  style?: string;
  listItem?: string;
  level?: number;
  tone?: string | null;
  variant?: string | null;
  referenceNumber?: number;
  children?: PortableTextSpan[];
  markDefs?: Array<Record<string, unknown>>;
  title?: string | null;
  body?: string | null;
  quote?: string | null;
  attribution?: string | null;
  sourceHref?: string | null;
  summary?: string | null;
  publisher?: string | null;
  author?: string | null;
  url?: string | null;
  accessedAt?: string | null;
  provider?: string | null;
  embedUrl?: string | null;
  caption?: string | null;
  diagramType?: string | null;
  mermaidCode?: string | null;
  ctaHref?: string | null;
  ctaLabel?: string | null;
  columns?: string[] | null;
  rows?: PortableTextTableRow[];
  items?: PortableTextBlockItem[];
  images?: PortableTextImage[];
  componentKey?: string | null;
  props?: Array<{ _key?: string; name?: string | null; value?: string | null }>;
  asset?: { _ref?: string; _type?: string } | null;
  alt?: string | null;
  code?: string | null;
  filename?: string | null;
  highlightedLines?: number[] | null;
  html?: string | null;
  language?: string | null;
  math?: string | null;
  /** Author-written eyebrow. Localized by the author, not by the renderer. */
  label?: string | null;
  /** comparisonTable: header above the row-label column. */
  dimensionLabel?: string | null;
  /** quoteBlock: title or company under the attribution. */
  role?: string | null;
  portrait?: PortableTextImage | null;
  /** chartBlock */
  points?: PortableTextChartPoint[];
  /** stepLadder */
  steps?: PortableTextStep[];
  /** faqBlock */
  defaultOpenFirst?: boolean | null;
  /** authorBio + entityChip */
  name?: string | null;
  bio?: string | null;
  avatar?: PortableTextImage | null;
  links?: PortableTextLink[];
  href?: string | null;
  logo?: PortableTextImage | null;
};

export type PortableTextTableCell = {
  _key?: string;
  children?: PortableTextSpan[];
  content?: PortableTextBlock[];
  markDefs?: Array<Record<string, unknown>>;
  text?: string | null;
};

export type PortableTextTableRow = {
  _key?: string;
  label?: string | null;
  cells?: string[];
  richCells?: PortableTextTableCell[];
};

export type PortableTextImage = {
  _key?: string;
  _type?: "image";
  asset?: { _ref?: string; _type?: string } | null;
  alt?: string | null;
  caption?: string | null;
  role?: string | null;
};

export type BlogPostBase = {
  id: string;
  slug: string;
  title: string;
  language: BlogLanguage;
  translationKey?: string;
  excerpt: string;
  description: string;
  date: string;
  updatedAt?: string;
  tags: string[];
  author?: string | BlogAuthor;
  mainImage?: unknown;
  body?: PortableTextBlock[] | null;
};

export type BlogPostWithSource = BlogPostBase & {
  source: BlogSource;
};

export type ResolvedBlogCover = {
  alt: string;
  blurDataURL: string;
  fallbackAlt: string;
  fallbackSrc: string;
  src: string;
  source: BlogSource;
};

export type BlogTocItem = {
  id: string;
  title: string;
  depth: 2 | 3 | 4;
};

export type BlogTableOfContents = {
  items: BlogTocItem[];
  headingIds: Record<string, string>;
};
