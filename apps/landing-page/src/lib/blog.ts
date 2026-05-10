/**
 * Stub for the blog data layer.
 *
 * The full implementation (MDX + Sanity merge) was in flight in another
 * branch but never landed; this file exists so `@/lib/blog` resolves and
 * the type-checker passes. At runtime it returns the static fallback list
 * shipped with the landing page.
 *
 * TODO: replace with the real MDX/Sanity-aware loader once the in-progress
 * blog refactor lands on main.
 */
import { type BlogPost, FALLBACK_POSTS } from "./blog-fallback";

export type { BlogPost };

export type BlogPostWithSource = BlogPost & {
  id: string;
  slug: string;
  description: string;
  date: string;
  tags: string[];
  author?: string;
  content?: string;
  source: "mdx" | "sanity" | "fallback";
};

function toFullPost(post: BlogPost, idx: number): BlogPostWithSource {
  const augmented = post as Partial<BlogPostWithSource>;
  return {
    ...post,
    id: augmented.id ?? `fallback-${idx}`,
    slug: augmented.slug ?? `fallback-${idx}`,
    title: post.title,
    description: augmented.description ?? "",
    date: augmented.date ?? new Date().toISOString(),
    tags: augmented.tags ?? [],
    source: "fallback",
  };
}

export async function getAllPosts(): Promise<BlogPostWithSource[]> {
  return FALLBACK_POSTS.map((p, i) => toFullPost(p, i));
}

export async function getPost(slug: string): Promise<BlogPostWithSource | null> {
  const posts = await getAllPosts();
  return posts.find((p) => p.slug === slug) ?? null;
}

export async function getAllSlugs(): Promise<string[]> {
  const posts = await getAllPosts();
  return posts.map((p) => p.slug);
}

// Back-compat alias — the in-flight refactor was renaming getPostBySlug → getPost.
export const getPostBySlug = getPost;
