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
  children?: PortableTextSpan[];
  markDefs?: Array<Record<string, unknown>>;
  rows?: Array<{ _key?: string; cells?: string[] }>;
  asset?: { _ref?: string; _type?: string } | null;
  alt?: string | null;
  caption?: string | null;
  code?: string | null;
  filename?: string | null;
  highlightedLines?: number[] | null;
  html?: string | null;
  language?: string | null;
  math?: string | null;
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
