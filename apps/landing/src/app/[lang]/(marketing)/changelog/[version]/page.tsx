import { getChangelogEntries } from "@nebutra/sanity/queries";
import { AnimateIn } from "@nebutra/ui/components";
import { format as dateFnsFormat } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { prerenderDefaultLocale } from "@/i18n/prerender";
import { type Locale, routing } from "@/i18n/routing";
import {
  findStaticChangelogRelease,
  STATIC_CHANGELOG_RELEASES as STATIC_RELEASES,
} from "@/lib/changelog-releases";
import { isZhUiLocale } from "@/lib/i18n/localized";
import { buildPageMetadata } from "@/lib/seo/metadata";

const TAG_COLORS: Record<string, string> = {
  feature: "var(--brand-accent)",
  improvement: "var(--status-warning)",
  fix: "var(--status-success)",
  breaking: "var(--status-danger)",
  security: "var(--brand-accent)",
  platform: "var(--status-warning)",
  infrastructure: "var(--brand-tertiary)",
  major: "hsl(var(--primary))",
  foundation: "var(--status-success)",
};

const CHANGELOG_CMS_TIMEOUT_MS = 1500;

interface PortableTextChild {
  _key?: string;
  text?: string;
}

interface PortableTextImageAsset {
  url?: string;
  metadata?: {
    dimensions?: {
      width?: number;
      height?: number;
    };
  };
}

type PortableTextBlock =
  | {
      _type?: "block";
      _key?: string;
      style?: "h2" | "h3" | "normal" | string;
      listItem?: "bullet" | "number" | string;
      children?: PortableTextChild[];
    }
  | {
      _type?: "image";
      _key?: string;
      alt?: string;
      asset?: PortableTextImageAsset;
    };

interface CmsEntry {
  _id: string;
  version: string;
  title: string;
  publishedAt: string;
  type?: string;
  summary?: string;
  body?: PortableTextBlock[];
}

async function getChangelogEntriesWithTimeout(): Promise<CmsEntry[]> {
  if (process.env.E2E_SKIP_CMS === "1") {
    return [];
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<[]>((resolve) => {
      timeoutId = setTimeout(() => resolve([]), CHANGELOG_CMS_TIMEOUT_MS);
    });
    return await Promise.race([getChangelogEntries(), timeout]);
  } catch {
    return [];
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Simple Portable Text renderer — handles block and image types
 */
function PortableTextRenderer({ blocks }: { blocks: PortableTextBlock[] }) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
      {blocks.map((block, idx) => {
        const blockKey = block._key ?? `${block._type ?? "block"}-${idx}`;
        if (block._type === "block") {
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
          const width = block.asset.metadata?.dimensions?.width ?? 960;
          const height = block.asset.metadata?.dimensions?.height ?? 540;

          return (
            <Image
              key={blockKey}
              src={block.asset.url}
              alt={block.alt || "Changelog image"}
              width={width}
              height={height}
              sizes="(min-width: 768px) 720px, 100vw"
              className="rounded-[var(--radius-lg)] max-w-full h-auto mt-4 mb-4"
            />
          );
        }

        return null;
      })}
    </div>
  );
}

/**
 * Cached data-fetching helper — inputs are plain strings so Next.js can
 * compute a deterministic cache key. `"use cache"` must NOT be placed at
 * module level (would wrap setRequestLocale inside a cache boundary) nor
 * directly on generateMetadata/generateStaticParams (params is a Promise,
 * not a serializable cache key).
 */
async function fetchChangelogEntries(): Promise<CmsEntry[]> {
  "use cache";
  cacheLife("hours");
  return getChangelogEntriesWithTimeout();
}

/**
 * Build metadata from serializable inputs so the inner `"use cache"` has a
 * stable key — mirrors the buildLegalMetadata pattern in legal/[slug]/page.tsx.
 */
async function buildChangelogMetadata(version: string, lang: string): Promise<Metadata> {
  "use cache";
  cacheLife("hours");

  const cmsEntries = await fetchChangelogEntries();
  const cmsEntry = cmsEntries.find((e) => e.version === version);
  const staticRelease = findStaticChangelogRelease(version);

  const release = cmsEntry
    ? {
        title: cmsEntry.title,
        description: cmsEntry.summary || cmsEntry.title,
        publishedTime: cmsEntry.publishedAt,
      }
    : staticRelease
      ? {
          title: staticRelease.title,
          description: staticRelease.summary,
          publishedTime: toIsoDate(staticRelease.date),
        }
      : null;
  if (!release) return {};

  const title = `v${version}: ${release.title} — Nebutra Changelog`;

  // Routed through buildPageMetadata so the release family obeys the same
  // publication contract as every other page: `content` scope means the 32
  // surrogate locales are noindex,follow and canonical at the primary release
  // URL instead of 34 self-canonical near-duplicates, and og:locale/og:image/
  // og:site_name survive because the openGraph key is extended, not replaced.
  return buildPageMetadata({
    title,
    description: release.description,
    path: `/changelog/${version}`,
    locale: lang as Locale,
    type: "article",
    publishedTime: release.publishedTime,
  });
}

/** `YYYY-MM` widens to the first of the month; an unparseable date is dropped. */
function toIsoDate(date: string): string | undefined {
  const normalized = /^\d{4}-\d{2}$/.test(date) ? `${date}-01` : date;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

/**
 * Pre-build the default locale only. Other locales render on-demand and are
 * then cached via PPR — `dynamicParams = true` is forbidden under
 * cacheComponents and also redundant (on-demand is the default).
 */
export async function generateStaticParams() {
  const cmsEntries = await fetchChangelogEntries();
  const versionsSource =
    cmsEntries.length > 0
      ? cmsEntries.map((e) => e.version)
      : STATIC_RELEASES.map((r) => r.version);
  const versions = versionsSource.slice(0, 12);

  return prerenderDefaultLocale(versions, (version) => ({ version }));
}

/**
 * Generate dynamic metadata for each version page.
 * Delegates to buildChangelogMetadata so the cache directive has serializable keys.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; version: string }>;
}): Promise<Metadata> {
  const { lang, version } = await params;
  if (!hasLocale(routing.locales, lang)) return {};
  return buildChangelogMetadata(version, lang);
}

/**
 * Individual changelog version page component
 */
export default async function ChangelogVersionPage({
  params,
}: {
  params: Promise<{ lang: string; version: string }>;
}) {
  const { lang, version } = await params;

  if (!hasLocale(routing.locales, lang)) {
    notFound();
  }

  setRequestLocale(lang as Locale);

  // Try CMS first — reuses the per-request deduplicated cached fetch
  const cmsEntries = await fetchChangelogEntries();
  const cmsEntry = cmsEntries.find((e) => e.version === version);

  if (cmsEntry) {
    const date = new Date(cmsEntry.publishedAt);
    const isZh = isZhUiLocale(lang);
    const formattedDate = Number.isNaN(date.getTime())
      ? cmsEntry.publishedAt
      : dateFnsFormat(
          date,
          isZh ? "yyyy年M月d日" : "MMMM d, yyyy",
          isZh ? { locale: zhCN } : undefined,
        );

    return (
      <main id="main-content" className="min-h-screen bg-background text-foreground">
        <Navbar />

        <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
          <AnimateIn preset="fadeUp">
            {/* Back link */}
            <div className="mb-8">
              <Link
                href="/changelog"
                className="inline-flex items-center text-sm font-medium text-[hsl(var(--primary))] hover:underline"
              >
                ← All releases
              </Link>
            </div>

            {/* Version header */}
            <header className="mb-8">
              <div className="mb-4 flex items-center gap-3">
                <span
                  className="inline-block rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{
                    backgroundColor: TAG_COLORS[cmsEntry.type || "feature"] || TAG_COLORS.feature,
                  }}
                >
                  {cmsEntry.type || "Feature"}
                </span>
                <time className="text-sm text-muted-foreground">{formattedDate}</time>
              </div>

              <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
                v{version}: {cmsEntry.title}
              </h1>

              {cmsEntry.summary && (
                <p className="mt-4 text-lg text-muted-foreground">{cmsEntry.summary}</p>
              )}
            </header>

            {/* Body content */}
            {cmsEntry.body ? (
              <PortableTextRenderer blocks={cmsEntry.body} />
            ) : cmsEntry.summary ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ul className="list-disc space-y-2 pl-4">
                  {cmsEntry.summary
                    .split("\n")
                    .filter(Boolean)
                    .map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                </ul>
              </div>
            ) : null}

            {/* Version navigation */}
            <nav className="mt-12 flex justify-between border-t border-border pt-8">
              {/* Previous version */}
              {(() => {
                const currentIdx = cmsEntries.findIndex((e) => e.version === version);
                const prevEntry = currentIdx > 0 ? cmsEntries[currentIdx - 1] : null;
                return prevEntry ? (
                  <Link
                    href={`/changelog/${prevEntry.version}`}
                    className="text-sm font-medium text-[hsl(var(--primary))] hover:underline"
                  >
                    ← v{prevEntry.version}
                  </Link>
                ) : (
                  <div />
                );
              })()}

              {/* Next version */}
              {(() => {
                const currentIdx = cmsEntries.findIndex((e) => e.version === version);
                const nextEntry =
                  currentIdx >= 0 && currentIdx < cmsEntries.length - 1
                    ? cmsEntries[currentIdx + 1]
                    : null;
                return nextEntry ? (
                  <Link
                    href={`/changelog/${nextEntry.version}`}
                    className="text-sm font-medium text-[hsl(var(--primary))] hover:underline"
                  >
                    v{nextEntry.version} →
                  </Link>
                ) : (
                  <div />
                );
              })()}
            </nav>
          </AnimateIn>
        </article>

        <FooterMinimal />
      </main>
    );
  }

  // Fall back to static data
  const staticRelease = STATIC_RELEASES.find((r) => r.version === version);

  if (!staticRelease) {
    notFound();
  }

  const date = new Date(staticRelease.date);
  const isZhStatic = isZhUiLocale(lang);
  const formattedDate = Number.isNaN(date.getTime())
    ? staticRelease.date
    : dateFnsFormat(
        date,
        isZhStatic ? "yyyy年M月d日" : "MMMM d, yyyy",
        isZhStatic ? { locale: zhCN } : undefined,
      );

  // Find previous and next in static releases
  const currentIdx = STATIC_RELEASES.findIndex((r) => r.version === version);
  const prevRelease = currentIdx > 0 ? STATIC_RELEASES[currentIdx - 1] : null;
  const nextRelease =
    currentIdx >= 0 && currentIdx < STATIC_RELEASES.length - 1
      ? STATIC_RELEASES[currentIdx + 1]
      : null;

  return (
    <main id="main-content" className="min-h-screen bg-background text-foreground">
      <Navbar />

      <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <AnimateIn preset="fadeUp">
          {/* Back link */}
          <div className="mb-8">
            <Link
              href="/changelog"
              className="inline-flex items-center text-sm font-medium text-[hsl(var(--primary))] hover:underline"
            >
              ← All releases
            </Link>
          </div>

          {/* Version header */}
          <header className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <span
                className="inline-block rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: staticRelease.tagColor }}
              >
                {staticRelease.tag}
              </span>
              <time className="text-sm text-muted-foreground">{formattedDate}</time>
            </div>

            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
              v{version}: {staticRelease.title}
            </h1>

            {staticRelease.summary && (
              <p className="mt-4 text-lg text-muted-foreground">{staticRelease.summary}</p>
            )}
          </header>

          {/* Highlights as bullet list */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ul className="list-disc space-y-3 pl-4">
              {staticRelease.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </div>

          {/* Version navigation */}
          <nav className="mt-12 flex justify-between border-t border-border pt-8">
            {prevRelease ? (
              <Link
                href={`/changelog/${prevRelease.version}`}
                className="text-sm font-medium text-[hsl(var(--primary))] hover:underline"
              >
                ← v{prevRelease.version}
              </Link>
            ) : (
              <div />
            )}

            {nextRelease ? (
              <Link
                href={`/changelog/${nextRelease.version}`}
                className="text-sm font-medium text-[hsl(var(--primary))] hover:underline"
              >
                v{nextRelease.version} →
              </Link>
            ) : (
              <div />
            )}
          </nav>
        </AnimateIn>
      </article>

      <FooterMinimal />
    </main>
  );
}
