import { getChangelogEntries } from "@nebutra/sanity/queries";
import { AnimateIn } from "@nebutra/ui/components";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { InteractiveChangelog, type Release } from "@/components/landing/InteractiveChangelog";
import { type Locale, routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) return {};
  return {
    title: "Changelog — Nebutra",
    description: "Every release, shipped with obsessive attention to detail.",
    alternates: {
      canonical: `/${lang}/changelog`,
      types: {
        "application/rss+xml": "/api/changelog/rss",
        "application/atom+xml": "/api/changelog/atom",
      },
    },
  };
}

const TAG_COLORS: Record<string, string> = {
  feat: "var(--cyan-9)",
  feature: "var(--cyan-9)",
  improvement: "var(--status-warning)",
  fix: "var(--status-success)",
  breaking: "var(--status-danger)",
  security: "var(--cyan-9)",
};

const FALLBACK_RELEASE_IMAGE = "/screenshots/demo-dashboard-command.webp";

// Static fallback data used when Sanity CMS has no entries yet
// Only includes user/developer-visible changes — pure infra ops entries are omitted
const STATIC_RELEASES = [
  {
    version: "1.2.0",
    date: "2026-04-12",
    tag: "Feat",
    tagColor: "var(--cyan-9)",
    highlights: [
      "Sleptons Matchmaker Beta — Pure Proof-of-Work visual verification enabled",
      "Agent Orchestration Engine — Drag-and-drop workflow hooks for 100% operational autonomy",
      "Algorithmic MRR Trackers — Automatic execution metric profiling for OPC members",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-03-30",
    tag: "Feat",
    tagColor: "var(--cyan-9)",
    highlights: [
      "Meta-Unicorn Impact Manifesto — The foundational 4 pillars fully implemented",
      "Builder Core Baseline — 50+ enterprise SaaS modules assembled into one initialization block",
      "Frictionless Payment Routing — Advanced automated billing tiers mapped directly to Agent consumption",
    ],
  },
  {
    version: "0.8.0",
    date: "2026-03-03",
    tag: "Feat",
    tagColor: "var(--cyan-9)",
    highlights: [
      "RBAC permission matrix — Re-designed strictly around programmatic (Code is Law) scoping",
      "Transactional telemetry — Sentry error tracking + Resend email automation",
    ],
  },
  {
    version: "0.5.0",
    date: "2026-01-25",
    tag: "Feat",
    tagColor: "var(--cyan-9)",
    highlights: [
      "Multi-tenant auth — Clerk with embedded enterprise team configurations",
      "AI service proxy routes — /api/v1/ai/chat, embeddings, models",
    ],
  },
  {
    version: "0.4.0",
    date: "2026-01-10",
    tag: "Feat",
    tagColor: "var(--cyan-9)",
    highlights: [
      "Turborepo monorepo — pnpm workspaces, 33 packages, Node 22",
      "Hono API gateway with OpenAPI + idiomatic middleware stack",
      "Prisma + Supabase (PostgreSQL + pgvector)",
    ],
  },
] as const;

interface PortableTextChild {
  text?: string;
}

interface PortableTextBlock {
  _type?: string;
  _key?: string;
  alt?: string;
  asset?: {
    url?: string;
  };
  children?: PortableTextChild[];
  listItem?: "bullet" | "number" | string;
  style?: string;
}

/**
 * Simple Portable Text renderer — handles block and image types
 * Supports basic Sanity Portable Text structure without external dependencies
 */
function PortableTextRenderer({ blocks }: { blocks: PortableTextBlock[] }) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
      {blocks.map((block, idx) => {
        const blockKey = block._key ?? `${block._type ?? "block"}-${idx}`;
        if (block._type === "block") {
          // Handle text blocks with styling
          const text = block.children?.map((child) => child.text ?? "").join("") || "";
          if (block.style === "h2") {
            return (
              <h2 key={blockKey} className="text-lg font-semibold mt-6 mb-3">
                {text}
              </h2>
            );
          }
          if (block.style === "h3") {
            return (
              <h3 key={blockKey} className="text-base font-semibold mt-4 mb-2">
                {text}
              </h3>
            );
          }
          if (block.listItem === "bullet") {
            return (
              <li key={blockKey} className="list-disc ml-4">
                {text}
              </li>
            );
          }
          if (block.listItem === "number") {
            return (
              <li key={blockKey} className="list-decimal ml-4">
                {text}
              </li>
            );
          }
          return (
            <p key={blockKey} className="text-sm leading-relaxed">
              {text}
            </p>
          );
        }

        if (block._type === "image" && block.asset?.url) {
          return (
            <Image
              key={blockKey}
              src={block.asset.url}
              alt={block.alt || "Changelog image"}
              width={1200}
              height={675}
              className="rounded-lg max-w-full h-auto mt-4 mb-4"
            />
          );
        }

        return null;
      })}
    </div>
  );
}

interface CmsEntry {
  _id: string;
  version: string;
  title: string;
  publishedAt: string;
  type?: string;
  summary?: string;
  body?: PortableTextBlock[];
}

export default async function ChangelogPage({ params }: { params: Promise<{ lang: string }> }) {
  "use cache";
  cacheLife("hours");

  const { lang } = await params;
  setRequestLocale(lang as Locale);

  // Try CMS first, fall back to static data
  const cmsEntries: CmsEntry[] = await getChangelogEntries().catch(() => []);
  const useCms = cmsEntries.length > 0;

  const mappedReleases: Release[] = useCms
    ? cmsEntries.map((entry) => {
        // Extract first image from body for preview, or use default
        const firstBodyImage = entry.body?.find((b) => b._type === "image")?.asset?.url;

        return {
          title: `v${entry.version}: ${entry.title}`,
          version: entry.version,
          date: entry.publishedAt?.split("T")[0] ?? "",
          tag: entry.type || "feature",
          tagColor: TAG_COLORS[entry.type || "feature"] || TAG_COLORS.feature,
          excerpt: entry.summary ?? entry.title,
          image: firstBodyImage || FALLBACK_RELEASE_IMAGE,
          content: entry.body ? (
            <PortableTextRenderer blocks={entry.body} />
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ul className="list-disc pl-4 space-y-2 mt-4">
                {entry.summary
                  ?.split("\n")
                  .filter(Boolean)
                  .map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
              </ul>
            </div>
          ),
          contributors: [],
        } as Release;
      })
    : STATIC_RELEASES.map((r) => {
        return {
          title: `v${r.version}: ${r.tag} Update`,
          version: r.version,
          date: r.date,
          tag: r.tag.toLowerCase(),
          tagColor: r.tagColor,
          excerpt: r.highlights.join(" · "),
          image: FALLBACK_RELEASE_IMAGE,
          content: (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ul className="list-disc pl-4 space-y-2 mt-4">
                {r.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          ),
          contributors: [],
        } as Release;
      });

  return (
    <main id="main-content" className="min-h-screen bg-white dark:bg-zinc-950">
      <Navbar forceDarkTheme />

      <InteractiveChangelog releases={mappedReleases} />

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <AnimateIn preset="fade" inView>
          <p className="text-center text-sm text-[var(--neutral-11)]">
            Subscribe to release notes via{" "}
            <Link
              href="/api/changelog/rss"
              className="font-medium text-[var(--blue-9)] underline-offset-4 hover:underline"
            >
              RSS
            </Link>{" "}
            or{" "}
            <Link
              href="/api/changelog/atom"
              className="font-medium text-[var(--blue-9)] underline-offset-4 hover:underline"
            >
              Atom
            </Link>{" "}
            or follow{" "}
            <a
              href="https://x.com/nebutra_ai"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--blue-9)] underline-offset-4 hover:underline"
            >
              @nebutra_ai
            </a>
            .
          </p>
        </AnimateIn>
      </section>

      <FooterMinimal />
    </main>
  );
}
