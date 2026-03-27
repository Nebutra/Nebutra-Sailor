export interface BlogPost {
  title: string;
  slug: string;
  excerpt: string;
  date: string;
  imageUrl?: string;
}

export const FALLBACK_POSTS: BlogPost[] = [
  {
    title: "Building a Multi-Tenant SaaS with Next.js 16",
    slug: "multi-tenant-nextjs-16",
    excerpt:
      "How we architected Nebutra Sailor's tenant isolation layer with Clerk organizations, row-level security, and per-tenant billing.",
    date: "2026-03-20",
  },
  {
    title: "AI Gateway: One API for All LLM Providers",
    slug: "ai-gateway-unified-api",
    excerpt:
      "Why we built a unified AI provider gateway and how it saves 40% on costs with intelligent model routing.",
    date: "2026-03-15",
  },
  {
    title: "From Zero to Production in 10 Minutes",
    slug: "zero-to-production",
    excerpt:
      "A walkthrough of scaffolding, configuring, and deploying your first SaaS with a single terminal command.",
    date: "2026-03-10",
  },
];
