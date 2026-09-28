export interface BlogPost {
  title: string;
  slug: string;
  excerpt: string;
  date: string;
  imageUrl?: string;
}

/**
 * What the blog shows with no CMS: a new project before it connects Sanity,
 * or any site while the CMS is unreachable. They say what they are. The
 * earlier set described Nebutra's architecture (with an auth provider it no
 * longer uses) and quoted a cost saving nobody measured.
 */
export const FALLBACK_POSTS: BlogPost[] = [
  {
    title: "Welcome to the blog",
    slug: "welcome",
    excerpt:
      "A sample post. Set NEXT_PUBLIC_SANITY_PROJECT_ID and the posts in your Sanity project take its place.",
    date: "2026-09-27",
  },
  {
    title: "Writing your first post",
    slug: "writing-your-first-post",
    excerpt:
      "Posts are Sanity documents: draft, schedule and translate them there; the site revalidates when you publish.",
    date: "2026-09-26",
  },
  {
    title: "What ships with this site",
    slug: "what-ships-with-this-site",
    excerpt:
      "A blog, a changelog, pricing, legal pages and a status page, on the same design system as the product.",
    date: "2026-09-25",
  },
];
