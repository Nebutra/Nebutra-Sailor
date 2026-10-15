import { getChangelogEntries } from "@nebutra/sanity/queries";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InteractiveChangelog, type Release } from "@/components/landing/InteractiveChangelog";
import { type Locale, routing } from "@/i18n/routing";
import { STATIC_CHANGELOG_RELEASES } from "@/lib/changelog-releases";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { Intro } from "@/nebutra/ui/page";

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
  const t = await getTranslations({ locale: lang, namespace: "changelogPage" });
  const metadata = buildPageMetadata({
    title: t("meta.title"),
    description: t("meta.description"),
    path: "/changelog",
    locale: lang as Locale,
  });

  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      types: {
        "application/rss+xml": "/api/changelog/rss",
        "application/atom+xml": "/api/changelog/atom",
      },
    },
  };
}

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
    <div className="prose prose-sm max-w-none space-y-4">
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
              className="rounded-[var(--radius-lg)] max-w-full h-auto mt-4 mb-4"
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
  const t = await getTranslations({ locale: lang, namespace: "changelogPage" });

  // Try CMS first, fall back to static data. E2E smoke runs should not depend on
  // live Sanity latency; they verify the rendered marketing surface contract.
  const cmsEntries: CmsEntry[] =
    process.env.E2E_SKIP_CMS === "1" ? [] : await getChangelogEntries().catch(() => []);
  const useCms = cmsEntries.length > 0;

  const mappedReleases: Release[] = useCms
    ? cmsEntries.map((entry) => {
        // A release shows a picture only when its own body carries one.
        const firstBodyImage = entry.body?.find((b) => b._type === "image")?.asset?.url;

        return {
          title: `v${entry.version}: ${entry.title}`,
          version: entry.version,
          date: entry.publishedAt?.split("T")[0] ?? "",
          tag: entry.type || "feature",
          excerpt: entry.summary ?? entry.title,
          image: firstBodyImage,
          content: entry.body ? (
            <PortableTextRenderer blocks={entry.body} />
          ) : (
            <div>
              <ul className="list-disc space-y-2 pl-5 marker:text-muted-foreground">
                {entry.summary
                  ?.split("\n")
                  .filter(Boolean)
                  .map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
              </ul>
            </div>
          ),
        } as Release;
      })
    : STATIC_CHANGELOG_RELEASES.map((r) => {
        return {
          title: `v${r.version}: ${r.title}`,
          version: r.version,
          date: r.date,
          tag: r.tag.toLowerCase(),
          excerpt: r.summary,
          content: (
            <div>
              <ul className="list-disc space-y-2 pl-5 marker:text-muted-foreground">
                {r.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          ),
        } as Release;
      });

  return (
    <main id="main-content" className="flex-1 bg-background">
      <section className="px-8 pt-28 pb-16 xl:px-16">
        <Intro level={1} title={t("title")} lead={t("lead")} />
      </section>

      <InteractiveChangelog
        releases={mappedReleases}
        labels={{
          searchLabel: t("searchLabel"),
          searchPlaceholder: t("searchPlaceholder"),
          all: t("all"),
          listLabel: t("listLabel"),
          readRelease: t("readRelease"),
          copyLink: t("copyLink"),
          linkCopied: t("linkCopied"),
          noMatchTitle: t("noMatch.title"),
          noMatchLead: t("noMatch.lead"),
        }}
      />

      <section className="px-8 py-16 xl:px-16">
        <p className="text-sm text-secondary-foreground">
          {t.rich("subscribe", {
            rss: (chunks) => (
              <Link
                href="/api/changelog/rss"
                className="text-foreground underline underline-offset-4 decoration-border transition-colors duration-micro hover:decoration-foreground"
              >
                {chunks}
              </Link>
            ),
            atom: (chunks) => (
              <Link
                href="/api/changelog/atom"
                className="text-foreground underline underline-offset-4 decoration-border transition-colors duration-micro hover:decoration-foreground"
              >
                {chunks}
              </Link>
            ),
            handle: (chunks) => (
              <a
                href="https://x.com/nebutra_ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4 decoration-border transition-colors duration-micro hover:decoration-foreground"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </section>
    </main>
  );
}
