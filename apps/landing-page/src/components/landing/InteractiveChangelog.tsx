"use client";

import {
  ChevronDown,
  Copy,
  External as ExternalLink,
  Filter,
  GitPullRequest,
  Fullscreen as Maximize2,
  Rss,
  MagnifyingGlass as Search,
} from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@nebutra/ui/primitives";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

export interface Release {
  title: string;
  version: string;
  date: string;
  tag?: string;
  tagColor?: string;
  image?: string;
  excerpt: string;
  contributors?: string[];
  content: React.ReactNode;
  reactions?: { emoji: string; count: number }[];
}

export interface InteractiveChangelogProps {
  releases: Release[];
}

// Tag color map for semantic styling
const TAG_COLORS: Record<string, string> = {
  feature: "var(--cyan-9)",
  improvement: "var(--status-warning)",
  fix: "var(--status-success)",
  breaking: "var(--status-danger)",
  security: "var(--cyan-9)",
  platform: "var(--status-warning)",
  infrastructure: "var(--brand-tertiary)",
  major: "var(--blue-9)",
  foundation: "var(--status-success)",
};

const FALLBACK_RELEASE_IMAGE = "/screenshots/demo-dashboard-command.webp";

// Debounce utility
function useDebounce<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export const InteractiveChangelog = ({ releases }: InteractiveChangelogProps) => {
  const [activeFilter, setActiveFilter] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [reactions, setReactions] = React.useState<Record<string, Record<string, number>>>({});

  const uniqueTags = Array.from(
    new Set(releases.map((release) => release.tag).filter((tag): tag is string => Boolean(tag))),
  ).sort();

  const filteredReleases = releases.filter((release) => {
    if (activeFilter && release.tag !== activeFilter) {
      return false;
    }

    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      const matchesTitle = release.title.toLowerCase().includes(query);
      const matchesExcerpt = release.excerpt.toLowerCase().includes(query);
      return matchesTitle || matchesExcerpt;
    }

    return true;
  });

  const getVersionSlug = (version: string) => {
    return version.replace(/[^a-zA-Z0-9.-]/g, "").toLowerCase() || "latest";
  };

  const handleCopyLink = (version: string) => {
    if (typeof navigator !== "undefined") {
      const slug = getVersionSlug(version);
      navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#${slug}`);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleReaction = (version: string, emoji: string) => {
    setReactions((prev) => {
      const versionReactions = prev[version] || {};
      const newCount = (versionReactions[emoji] || 0) + 1;
      return {
        ...prev,
        [version]: {
          ...versionReactions,
          [emoji]: newCount,
        },
      };
    });
  };

  return (
    <section className="relative w-full overflow-hidden bg-[var(--neutral-1)] dark:bg-black">
      <div className="relative isolate w-full overflow-hidden border-b border-white/10 bg-[#030712] pt-28 pb-20 text-white sm:pt-32 md:pb-24">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_24%,rgba(11,241,195,0.28),transparent_30%),radial-gradient(circle_at_76%_16%,rgba(0,51,254,0.36),transparent_34%),radial-gradient(circle_at_82%_88%,rgba(91,72,255,0.24),transparent_34%),linear-gradient(135deg,#020617_0%,#07111f_45%,#030712_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_78%_66%_at_50%_14%,#000_36%,transparent_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.2)_1px,transparent_1.4px)] bg-[size:20px_20px] opacity-25 [mask-image:linear-gradient(90deg,transparent_0%,#000_14%,#000_86%,transparent_100%)]" />
          <div className="absolute -left-32 top-24 h-64 w-[48rem] -rotate-12 rounded-full bg-[linear-gradient(90deg,rgba(11,241,195,0.24),rgba(0,51,254,0.14),transparent)] blur-3xl" />
          <div className="absolute right-[-18rem] top-[-12rem] h-[34rem] w-[34rem] rounded-full bg-[var(--blue-9)]/25 blur-[130px]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          {/* Bottom fade-to-bg mask removed (2026-05-14): in light mode it created
              a milky "smear" over the tagline; in dark mode it faded into the same
              near-black so was visually inert. The hero's `border-b border-white/10`
              already provides a clean hero→content seam — preferred Linear/Vercel
              pattern of hard edge over soft gradient. */}
        </div>

        <div className="relative container mx-auto px-4 text-left">
          <div className="flex max-w-4xl flex-col gap-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/14 bg-white/8 px-3 py-1 text-sm font-medium text-white/80 shadow-[0_12px_40px_-24px_rgba(11,241,195,0.8)] backdrop-blur-md">
              <GitPullRequest className="size-4" />
              <p>Changelog</p>
              <Link href="/api/changelog/rss" aria-label="Subscribe to changelog RSS">
                <Rss className="size-4 ml-1 hover:text-white transition-colors" />
              </Link>
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
              Changelog
              <br /> Latest Enhancements & Platform News
            </h1>
            <p className="max-w-2xl text-base leading-7 text-white/68 sm:text-lg">
              Follow every product-grade improvement across the Nebutra AI SaaS platform.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="sticky top-0 z-40 w-full bg-gradient-to-b from-[var(--neutral-1)] to-transparent dark:from-black/95 border-b border-[var(--neutral-7)] dark:border-[var(--neutral-2)] backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Search input */}
            <div className="flex-1 lg:max-w-xs">
              <Input
                type="search"
                prefix={<Search className="size-4" />}
                placeholder="Search releases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Filter className="size-4 text-[var(--neutral-11)] flex-shrink-0" />
              <button
                type="button"
                onClick={() => setActiveFilter(null)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                  activeFilter === null
                    ? "bg-[var(--blue-9)] text-white"
                    : "bg-[var(--neutral-2)] text-[var(--neutral-12)] hover:bg-[var(--neutral-3)] dark:bg-[var(--neutral-3)] dark:hover:bg-[var(--neutral-4)]"
                }`}
              >
                All
              </button>
              {uniqueTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveFilter(tag === activeFilter ? null : tag)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                    activeFilter === tag
                      ? "text-white"
                      : "bg-[var(--neutral-2)] text-[var(--neutral-12)] hover:bg-[var(--neutral-3)] dark:bg-[var(--neutral-3)] dark:hover:bg-[var(--neutral-4)]"
                  }`}
                  style={activeFilter === tag ? { background: "var(--brand-gradient)" } : undefined}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* content */}
      <div className="container mx-auto grid justify-center px-4 border-x border-[var(--neutral-7)] dark:border-[var(--neutral-2)]">
        {filteredReleases.length > 0 ? (
          <ol aria-label="Changelog releases" className="contents">
            {filteredReleases.map((item, idx) => {
              const slug = getVersionSlug(item.version);
              const versionReactions = reactions[item.version] || {};
              const reactionsArray = [
                { emoji: "🚀", label: "Rocket" },
                { emoji: "🎉", label: "Celebrate" },
                { emoji: "❤️", label: "Love" },
                { emoji: "👍", label: "Thumbs Up" },
              ];

              return (
                <Dialog key={slug || idx}>
                  <li className="list-none">
                    <AnimateIn preset="fadeUp" inView>
                      <article
                        id={slug}
                        className="relative flex w-full flex-col gap-6 py-16 lg:flex-row lg:gap-0 scroll-mt-32 group"
                      >
                        {/* Timeline dot */}
                        <div className="absolute left-0 top-24 hidden lg:block">
                          <div className="relative flex items-center justify-center">
                            <div className="h-3 w-3 rounded-full bg-[var(--blue-9)] ring-4 ring-[var(--neutral-1)] dark:ring-black" />
                            <div className="absolute inset-0 rounded-full bg-[var(--blue-9)] opacity-20 animate-pulse" />
                          </div>
                        </div>

                        <div className="h-fit lg:sticky lg:top-8">
                          <time className="w-36 text-sm font-medium text-[var(--neutral-11)] lg:absolute pl-8 lg:pl-0">
                            {item.date}
                          </time>
                        </div>

                        <div className="flex max-w-prose flex-col gap-4 lg:mx-auto lg:pl-16">
                          {/* Title with tag */}
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-3xl font-medium lg:pt-10 lg:text-3xl text-[var(--neutral-12)]">
                                  {item.title}
                                </h3>
                                {item.tag && (
                                  <span
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white mt-2 lg:mt-11"
                                    style={{
                                      backgroundColor: TAG_COLORS[item.tag] || "var(--blue-9)",
                                    }}
                                  >
                                    {item.tag}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-semibold text-[var(--neutral-11)] tracking-wide">
                                {item.version}
                              </span>
                            </div>
                          </div>

                          <DialogTrigger asChild>
                            <div className="relative cursor-pointer group/image">
                              <Image
                                src={item.image || FALLBACK_RELEASE_IMAGE}
                                alt={item.title}
                                width={1200}
                                height={700}
                                className="max-h-96 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-7)] dark:border-[var(--neutral-2)] object-cover transition-transform duration-500 ease-in-out group-image/image:hover:scale-[1.01]"
                                unoptimized={item.image?.endsWith(".svg")}
                              />
                              <div className="absolute inset-0 rounded-[var(--radius-lg)] bg-gradient-to-b from-transparent to-black/50 opacity-100" />
                            </div>
                          </DialogTrigger>

                          <p className="text-[var(--neutral-11)] text-sm font-medium">
                            {item.excerpt}
                          </p>

                          {/* Contributors and actions row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              {item.contributors && item.contributors.length > 0 && (
                                <div className="flex items-center -space-x-2">
                                  {item.contributors.slice(0, 3).map((src, id) => (
                                    <Image
                                      key={id}
                                      src={src}
                                      alt="Contributor"
                                      width={96}
                                      height={96}
                                      className="size-6 rounded-full border border-[var(--neutral-7)] dark:border-[var(--neutral-2)] object-cover"
                                    />
                                  ))}
                                </div>
                              )}
                              {item.contributors && item.contributors.length > 3 && (
                                <span className="ml-1 text-sm font-medium text-[var(--neutral-11)]">
                                  +{item.contributors.length - 3} contributors
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <DialogTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Show full release"
                                      >
                                        <Maximize2 className="size-4" />
                                      </Button>
                                    </DialogTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Show full release</p>
                                  </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleCopyLink(item.version)}
                                      aria-label="Copy link to release"
                                    >
                                      <Copy className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Copy link</p>
                                  </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      asChild
                                      aria-label="Open in new tab"
                                    >
                                      <a
                                        href={`/changelog/${item.version}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <ExternalLink className="size-4" />
                                      </a>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Open in new tab</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>

                          {/* Reaction buttons */}
                          <div className="flex items-center gap-2 pt-2">
                            {reactionsArray.map(({ emoji, label }) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleReaction(item.version, emoji)}
                                className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--neutral-2)] dark:bg-[var(--neutral-3)] hover:bg-[var(--neutral-3)] dark:hover:bg-[var(--neutral-4)] transition-colors text-xs font-medium text-[var(--neutral-12)]"
                                aria-label={`React with ${label}`}
                              >
                                <span>{emoji}</span>
                                {versionReactions[emoji] && (
                                  <span className="text-[var(--neutral-11)]">
                                    {versionReactions[emoji]}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>

                          {/* View details link */}
                          <Link
                            href={`/changelog/${item.version}`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--blue-9)] hover:text-[var(--blue-8)] transition-colors rounded px-1"
                          >
                            View details
                            <ChevronDown className="size-4 -rotate-90" />
                          </Link>
                        </div>

                        {/* Dividing line connecting items */}
                        <div className="absolute bottom-0 left-0 right-0 h-px w-[200vw] -translate-x-1/2 bg-[var(--neutral-7)] dark:bg-[var(--neutral-2)]" />
                      </article>
                    </AnimateIn>

                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-prose bg-[var(--neutral-1)] dark:bg-[var(--neutral-2)]">
                      <DialogHeader>
                        <DialogTitle className="text-left text-[var(--neutral-12)]">
                          {item.title}
                        </DialogTitle>
                        <DialogDescription className="text-left text-[var(--neutral-11)]">
                          {item.excerpt}
                        </DialogDescription>
                      </DialogHeader>
                      <Image
                        src={item.image || FALLBACK_RELEASE_IMAGE}
                        alt={item.title}
                        width={1200}
                        height={700}
                        className="max-h-96 w-full rounded-[var(--radius-lg)] border border-[var(--neutral-7)] dark:border-[var(--neutral-3)] object-cover"
                        unoptimized={item.image?.endsWith(".svg")}
                      />
                      {item.content}
                    </DialogContent>
                  </li>
                </Dialog>
              );
            })}
          </ol>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Search className="size-12 text-[var(--neutral-7)] dark:text-[var(--neutral-3)]" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-[var(--neutral-12)] mb-1">
                No releases found
              </h3>
              <p className="text-sm text-[var(--neutral-11)]">
                Try adjusting your filters or search query
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
