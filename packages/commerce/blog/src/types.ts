export type BlogSource = "sanity" | "fallback";
export type BlogLanguage = "en" | "zh";

export type BlogAuthor = {
  name?: string | null;
  image?: unknown;
  bio?: unknown;
};

export type PortableTextSpan = {
  _type?: "span";
  _key?: string;
  text?: string;
  marks?: string[];
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
  items?: Array<{
    _key?: string;
    title?: string | null;
    body?: string | null;
    label?: string | null;
    value?: string | null;
    caption?: string | null;
  }>;
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
