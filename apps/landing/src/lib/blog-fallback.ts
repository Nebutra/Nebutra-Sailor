export interface BlogPost {
  title: string;
  slug: string;
  excerpt: string;
  date: string;
  imageUrl?: string;
  /** Paragraphs; a heading is a paragraph starting with "## ". */
  body?: string[];
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
    body: [
      "This post is here so the blog has something to show before it has anything to say. It disappears the moment the site reads from a CMS.",
      "## Connect your posts",
      "Create a Sanity project, set NEXT_PUBLIC_SANITY_PROJECT_ID (and NEXT_PUBLIC_SANITY_DATASET if it is not production), and redeploy. The index, the tag pages, the feeds and the sitemap all switch to your posts.",
    ],
  },
  {
    title: "Writing your first post",
    slug: "writing-your-first-post",
    excerpt:
      "Posts are Sanity documents: draft, schedule and translate them there; the site revalidates when you publish.",
    date: "2026-09-26",
    body: [
      "A post is a Sanity document with a title, a slug, a summary and a body. Give it a cover image when you have one worth showing; a post without one gets a text card, not a stand-in picture.",
      "## Draft, schedule, translate",
      "Drafts stay private until you publish. Set a publish date to schedule. Translations share a translation key, so each language version links to the others.",
      "Publishing calls the site's revalidation webhook: the post, the index and the feeds refresh without a redeploy.",
    ],
  },
  {
    title: "What ships with this site",
    slug: "what-ships-with-this-site",
    excerpt:
      "A blog, a changelog, pricing, legal pages and a status page, on the same design system as the product.",
    date: "2026-09-25",
    body: [
      "The public site ships as one app on the same design system as the product: the home page, features, pricing, this blog, a changelog, legal pages and a status page.",
      "## One look, everywhere",
      "Colours, type and spacing come from the design tokens. Pick a look in Sailor Studio and every page, including this one, follows.",
      "Most of the copy lives in src/content/site.ts, so changing what a page says rarely means touching its layout.",
    ],
  },
];
