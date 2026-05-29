"use client";

import { Box, Calendar, Menu, MagnifyingGlass as Search, User } from "@nebutra/icons";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BlogImage } from "./blog-image";

export type BlogIndexPost = {
  id: string;
  title: string;
  excerpt: string;
  href: string;
  tags: string[];
  dateLabel: string | null;
  readTime: string;
  authorName: string | null;
  authorAvatarUrl: string | null;
  fallbackImageAlt: string;
  fallbackImageUrl: string;
  imageBlurDataURL?: string;
  imageUrl: string;
  imageAlt: string;
  searchText?: string;
  viewTransitionName?: string;
};

type BlogIndexExplorerProps = {
  posts: BlogIndexPost[];
  isZh: boolean;
};

type ViewMode = "grid" | "list";

function getInitials(name: string | null): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
}

function AuthorAvatar({
  name,
  src,
  size = "sm",
}: {
  name: string | null;
  src: string | null;
  size?: "sm" | "md";
}) {
  const className =
    size === "md"
      ? "size-8 rounded-full border border-[var(--neutral-7)]"
      : "size-6 rounded-full border border-[var(--neutral-7)]";

  if (src) {
    return (
      <Image
        src={src}
        alt={name ? `${name} avatar` : ""}
        width={size === "md" ? 32 : 24}
        height={size === "md" ? 32 : 24}
        className={`${className} bg-[var(--neutral-2)] object-cover`}
      />
    );
  }

  return (
    <span
      className={`${className} inline-flex items-center justify-center bg-[var(--neutral-2)] text-[10px] font-semibold text-[var(--neutral-11)]`}
      aria-hidden
    >
      {name ? getInitials(name) : <User className="size-3.5" />}
    </span>
  );
}

function PostMeta({ post }: { post: BlogIndexPost }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--neutral-10)]">
      {post.dateLabel && (
        <span className="inline-flex items-center gap-1">
          <Calendar className="size-3.5" aria-hidden />
          {post.dateLabel}
        </span>
      )}
      <span>{post.readTime}</span>
    </div>
  );
}

function TagPill({ tag }: { tag: string }) {
  return (
    <span className="rounded-full border border-[var(--neutral-6)] bg-[var(--neutral-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--neutral-11)]">
      {tag}
    </span>
  );
}

function GridCard({ post }: { post: BlogIndexPost }) {
  return (
    <Link
      href={post.href}
      className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] transition-colors hover:border-[var(--neutral-8)] hover:bg-[var(--neutral-2)]"
    >
      <div
        className="relative h-52 overflow-hidden bg-[var(--neutral-3)]"
        style={
          post.viewTransitionName ? { viewTransitionName: post.viewTransitionName } : undefined
        }
      >
        <BlogImage
          src={post.imageUrl}
          alt={post.imageAlt}
          fallbackSrc={post.fallbackImageUrl}
          fallbackAlt={post.fallbackImageAlt}
          blurDataURL={post.imageBlurDataURL}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
          className="object-cover transition-transform duration-200 group-hover:scale-[1.015]"
        />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <PostMeta post={post} />
        <h2 className="mt-3 text-lg font-semibold leading-snug text-[var(--neutral-12)] transition-colors group-hover:text-[var(--blue-9)]">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--neutral-11)]">
            {post.excerpt}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <div className="flex min-w-0 items-center gap-2">
            <AuthorAvatar name={post.authorName} src={post.authorAvatarUrl} />
            {post.authorName && (
              <span className="truncate text-xs font-medium text-[var(--neutral-11)]">
                {post.authorName}
              </span>
            )}
          </div>
          {post.tags[0] && <TagPill tag={post.tags[0]} />}
        </div>
      </div>
    </Link>
  );
}

function ListCard({ post }: { post: BlogIndexPost }) {
  return (
    <Link
      href={post.href}
      className="group grid gap-5 rounded-[var(--radius-md)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-3 transition-colors hover:border-[var(--neutral-8)] hover:bg-[var(--neutral-2)] sm:grid-cols-[220px_1fr]"
    >
      <div
        className="relative min-h-40 overflow-hidden rounded-[calc(var(--radius-md)-2px)] bg-[var(--neutral-3)]"
        style={
          post.viewTransitionName ? { viewTransitionName: post.viewTransitionName } : undefined
        }
      >
        <BlogImage
          src={post.imageUrl}
          alt={post.imageAlt}
          fallbackSrc={post.fallbackImageUrl}
          fallbackAlt={post.fallbackImageAlt}
          blurDataURL={post.imageBlurDataURL}
          fill
          sizes="(max-width: 640px) 100vw, 220px"
          className="object-cover transition-transform duration-200 group-hover:scale-[1.015]"
        />
      </div>

      <div className="flex min-w-0 flex-col py-1 pr-2">
        <PostMeta post={post} />
        <h2 className="mt-3 text-xl font-semibold leading-snug text-[var(--neutral-12)] transition-colors group-hover:text-[var(--blue-9)]">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--neutral-11)]">
            {post.excerpt}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
          <div className="flex min-w-0 items-center gap-2">
            <AuthorAvatar name={post.authorName} src={post.authorAvatarUrl} size="md" />
            {post.authorName && (
              <span className="truncate text-sm font-medium text-[var(--neutral-11)]">
                {post.authorName}
              </span>
            )}
          </div>
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.slice(0, 3).map((tag) => (
                <TagPill key={tag} tag={tag} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function BlogIndexExplorer({ posts, isZh }: BlogIndexExplorerProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    posts.forEach((post) => {
      post.tags.forEach((tag) => {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      });
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [posts]);

  const tags = tagCounts.map(([tag]) => tag);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesTag = !activeTag || post.tags.includes(activeTag);
      if (!matchesTag) return false;
      if (!normalizedQuery) return true;

      const searchable = [
        post.title,
        post.excerpt,
        post.authorName ?? "",
        post.tags.join(" "),
        post.searchText ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [activeTag, posts, query]);

  const copy = {
    all: isZh ? "全部" : "All",
    archive: isZh ? "文章归档" : "All articles",
    count: isZh
      ? `${filteredPosts.length} / ${posts.length} 篇`
      : `${filteredPosts.length} of ${posts.length}`,
    emptyTitle: isZh ? "没有匹配文章" : "No matching posts",
    emptyBody: isZh
      ? "换一个关键词或取消分类筛选。"
      : "Try another keyword or clear the topic filter.",
    search: isZh ? "搜索标题、作者或主题" : "Search title, author, or topic",
    topics: isZh ? "主题" : "Topics",
    filter: isZh ? "筛选与排序" : "Filter and sort",
    sort: isZh ? "排序" : "Sort",
    latest: isZh ? "最新优先" : "Latest first",
    category: isZh ? "分类" : "Category",
    view: isZh ? "视图" : "View",
    grid: isZh ? "网格视图" : "Grid view",
    list: isZh ? "列表视图" : "List view",
  };

  return (
    <section className="mt-16">
      <div className="grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <p className="text-sm font-semibold text-[var(--neutral-12)]">{copy.filter}</p>
            <div className="mt-3 border-t border-[var(--neutral-6)]">
              <div className="border-b border-[var(--neutral-6)] py-4">
                <div className="flex items-center justify-between gap-4 text-sm text-[var(--neutral-11)]">
                  <span>{copy.sort}</span>
                  <span className="font-medium text-[var(--neutral-12)]">{copy.latest}</span>
                </div>
              </div>
              <fieldset className="border-b border-[var(--neutral-6)] py-4">
                <legend className="mb-3 text-sm text-[var(--neutral-11)]">{copy.category}</legend>
                <div className="space-y-1">
                  <button
                    type="button"
                    aria-pressed={!activeTag}
                    onClick={() => setActiveTag(null)}
                    className={`flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm transition-colors ${
                      !activeTag
                        ? "bg-[var(--neutral-12)] text-[var(--neutral-1)]"
                        : "text-[var(--neutral-11)] hover:bg-[var(--neutral-2)] hover:text-[var(--neutral-12)]"
                    }`}
                  >
                    <span>{copy.all}</span>
                    <span className="text-xs opacity-70">{posts.length}</span>
                  </button>
                  {tagCounts.map(([tag, count]) => {
                    const active = activeTag === tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setActiveTag(active ? null : tag)}
                        className={`flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm transition-colors ${
                          active
                            ? "bg-[var(--neutral-12)] text-[var(--neutral-1)]"
                            : "text-[var(--neutral-11)] hover:bg-[var(--neutral-2)] hover:text-[var(--neutral-12)]"
                        }`}
                      >
                        <span className="truncate">{tag}</span>
                        <span className="text-xs opacity-70">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--neutral-10)]">
                {copy.archive}
              </p>
              <p className="mt-2 text-sm text-[var(--neutral-11)]">{copy.count}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative block sm:w-80">
                <span className="sr-only">{copy.search}</span>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--neutral-10)]"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={copy.search}
                  className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--neutral-7)] bg-[var(--neutral-1)] px-9 text-sm text-[var(--neutral-12)] outline-none transition-colors placeholder:text-[var(--neutral-9)] focus:border-[var(--blue-8)] focus:ring-2 focus:ring-[var(--blue-5)]"
                />
              </label>

              <fieldset className="inline-flex h-11 w-fit rounded-[var(--radius-md)] border border-[var(--neutral-7)] bg-[var(--neutral-2)] p-1">
                <legend className="sr-only">{copy.view}</legend>
                {(["grid", "list"] as const).map((mode) => {
                  const active = viewMode === mode;
                  const Icon = mode === "grid" ? Box : Menu;
                  return (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={active}
                      aria-label={mode === "grid" ? copy.grid : copy.list}
                      onClick={() => setViewMode(mode)}
                      className={`inline-flex h-9 w-10 items-center justify-center rounded-[calc(var(--radius-md)-4px)] transition-colors ${
                        active
                          ? "bg-[var(--neutral-1)] text-[var(--neutral-12)] shadow-sm"
                          : "text-[var(--neutral-10)] hover:bg-[var(--neutral-1)] hover:text-[var(--neutral-12)]"
                      }`}
                    >
                      <Icon className="size-4" aria-hidden />
                    </button>
                  );
                })}
              </fieldset>
            </div>
          </div>

          <fieldset className="mt-5 flex min-w-0 max-w-full items-center gap-2 overflow-x-auto pb-1 lg:hidden">
            <legend className="sr-only">{copy.topics}</legend>
            <button
              type="button"
              aria-pressed={!activeTag}
              onClick={() => setActiveTag(null)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                !activeTag
                  ? "border-[var(--neutral-12)] bg-[var(--neutral-12)] text-[var(--neutral-1)]"
                  : "border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-11)] hover:border-[var(--neutral-8)] hover:text-[var(--neutral-12)]"
              }`}
            >
              {copy.all}
            </button>
            {tags.map((tag) => {
              const active = activeTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveTag(active ? null : tag)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "border-[var(--neutral-12)] bg-[var(--neutral-12)] text-[var(--neutral-1)]"
                      : "border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-11)] hover:border-[var(--neutral-8)] hover:text-[var(--neutral-12)]"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </fieldset>

          {filteredPosts.length === 0 ? (
            <div className="mt-8 rounded-[var(--radius-md)] border border-dashed border-[var(--neutral-7)] bg-[var(--neutral-1)] px-6 py-12 text-center">
              <p className="text-base font-semibold text-[var(--neutral-12)]">{copy.emptyTitle}</p>
              <p className="mt-2 text-sm text-[var(--neutral-11)]">{copy.emptyBody}</p>
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
                  : "mt-8 grid gap-4"
              }
            >
              {filteredPosts.map((post) =>
                viewMode === "grid" ? (
                  <GridCard key={post.id} post={post} />
                ) : (
                  <ListCard key={post.id} post={post} />
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
