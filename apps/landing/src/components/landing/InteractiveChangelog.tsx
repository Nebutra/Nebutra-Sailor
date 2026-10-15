"use client";

import { MagnifyingGlass as Search } from "@nebutra/icons";
import { useDebouncedValue } from "@nebutra/ui/hooks";
import { CopyButton, FilterPills, Input } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import Image from "next/image";
import * as React from "react";
import { Link } from "@/i18n/navigation";
import { changelogTagClassName } from "@/lib/changelog-releases";

export interface Release {
  title: string;
  version: string;
  date: string;
  tag?: string;
  /** A screenshot that belongs to this release. No release gets a stand-in. */
  image?: string;
  excerpt: string;
  content: React.ReactNode;
}

/** Copy, resolved on the server so the changelog adds nothing to every page's client messages. */
export interface ChangelogLabels {
  searchLabel: string;
  searchPlaceholder: string;
  all: string;
  listLabel: string;
  readRelease: string;
  copyLink: string;
  linkCopied: string;
  noMatchTitle: string;
  noMatchLead: string;
}

export interface InteractiveChangelogProps {
  releases: Release[];
  labels: ChangelogLabels;
}

const ALL = "__all__";

const versionSlug = (version: string) =>
  version.replace(/[^a-zA-Z0-9.-]/g, "").toLowerCase() || "latest";

/**
 * The release list, Linear's changelog shape on the site's grid: a date
 * column, then the release (title, version, what changed) in full, so the
 * page reads without opening anything. A release shows a picture only when it
 * has one of its own; the shared dashboard still that used to stand in for
 * every release is gone (the site's "no mocks" rule, nebutra/DESIGN.md).
 */
export function InteractiveChangelog({ releases, labels }: InteractiveChangelogProps) {
  const t = (key: keyof ChangelogLabels) => labels[key];
  const [tag, setTag] = React.useState(ALL);
  const [query, setQuery] = React.useState("");
  const [origin, setOrigin] = React.useState("");
  React.useEffect(() => setOrigin(`${window.location.origin}${window.location.pathname}`), []);
  const debounced = useDebouncedValue(query, 200);

  const tags = [
    ...new Set(releases.map((r) => r.tag).filter((x): x is string => Boolean(x))),
  ].sort();
  const q = debounced.trim().toLowerCase();
  const shown = releases.filter(
    (r) =>
      (tag === ALL || r.tag === tag) &&
      (!q || r.title.toLowerCase().includes(q) || r.excerpt.toLowerCase().includes(q)),
  );

  return (
    <>
      {/* The filter row sticks under the site bar (h-16), not beneath it. */}
      <div className="sticky top-16 z-30 border-y border-border bg-background/90 px-8 py-3 backdrop-blur-xl xl:px-16">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:max-w-xs">
            <Input
              type="search"
              aria-label={t("searchLabel")}
              prefix={<Search className="size-4" aria-hidden />}
              placeholder={t("searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <FilterPills
            variant="subtle"
            value={tag}
            onValueChange={setTag}
            options={[
              { value: ALL, label: t("all") },
              ...tags.map((x) => ({ value: x, label: x })),
            ]}
            className="overflow-x-auto"
          />
        </div>
      </div>

      {shown.length > 0 ? (
        <ol aria-label={t("listLabel")}>
          {shown.map((r) => {
            const slug = versionSlug(r.version);
            return (
              <li
                key={slug}
                id={slug}
                className="scroll-mt-40 border-b border-border px-8 py-16 xl:px-16"
              >
                <article className="grid grid-cols-1 gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
                  <div className="flex flex-row flex-wrap items-baseline gap-3 lg:sticky lg:top-40 lg:h-fit lg:flex-col lg:gap-2">
                    <time dateTime={r.date} className="text-sm text-secondary-foreground">
                      {r.date}
                    </time>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">v{r.version}</span>
                      {r.tag ? (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            changelogTagClassName(r.tag),
                          )}
                        >
                          {r.tag}
                        </span>
                      ) : null}
                    </span>
                  </div>

                  <div className="min-w-0 max-w-2xl">
                    <h2 className="font-heading text-2xl tracking-heading text-balance text-foreground md:text-3xl">
                      <Link
                        href={`/changelog/${r.version}`}
                        className="transition-colors duration-micro hover:text-secondary-foreground"
                      >
                        {r.title}
                      </Link>
                    </h2>
                    <p className="mt-4 text-lg text-secondary-foreground">{r.excerpt}</p>
                    {r.image ? (
                      <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-muted">
                        <Image
                          src={r.image}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 42rem, 100vw"
                          className="object-cover"
                          unoptimized={r.image.endsWith(".svg")}
                        />
                      </div>
                    ) : null}
                    <div className="mt-6 text-base text-secondary-foreground">{r.content}</div>
                    <div className="mt-8 flex items-center gap-2">
                      <Link
                        href={`/changelog/${r.version}`}
                        className="inline-flex items-center gap-2 text-sm text-secondary-foreground transition-colors duration-micro hover:text-foreground"
                      >
                        {t("readRelease")}
                        <span aria-hidden>→</span>
                      </Link>
                      <CopyButton
                        value={`${origin}#${slug}`}
                        iconType="link"
                        tooltipText={t("copyLink")}
                        successMessage={t("linkCopied")}
                      />
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="border-b border-border px-8 py-24 xl:px-16">
          <h2 className="font-heading text-xl text-foreground">{t("noMatchTitle")}</h2>
          <p className="mt-2 text-sm text-secondary-foreground">{t("noMatchLead")}</p>
        </div>
      )}
    </>
  );
}
