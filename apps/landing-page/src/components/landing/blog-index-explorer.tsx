"use client";

import { Box, Calendar, Menu, MagnifyingGlass as Search } from "@nebutra/icons";
import { Input } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BlogAuthorAvatar } from "./blog-author-avatar";
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
            <BlogAuthorAvatar name={post.authorName} src={post.authorAvatarUrl} />
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
            <BlogAuthorAvatar name={post.authorName} src={post.authorAvatarUrl} size="md" />
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
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return posts;
    return posts.filter((post) => {
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
  }, [posts, query]);

  const copy = {
    archive: isZh ? "文章归档" : "All articles",
    count: isZh
      ? `${filteredPosts.length} / ${posts.length} 篇`
      : `${filteredPosts.length} of ${posts.length}`,
    emptyTitle: isZh ? "没有匹配文章" : "No matching posts",
    emptyBody: isZh ? "换一个关键词试试。" : "Try another keyword.",
    search: isZh ? "搜索标题、作者或主题" : "Search title, author, or topic",
    view: isZh ? "视图" : "View",
    grid: isZh ? "网格视图" : "Grid view",
    list: isZh ? "列表视图" : "List view",
  };

  return (
    <section className="mt-16">
      <div className="flex flex-col gap-4 border-t border-[var(--neutral-6)] pt-8 sm:flex-row sm:items-end sm:justify-between">
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
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.search}
              className="h-11 w-full pl-9"
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

      {filteredPosts.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-md)] border border-dashed border-[var(--neutral-7)] bg-[var(--neutral-1)] px-6 py-12 text-center">
          <p className="text-base font-semibold text-[var(--neutral-12)]">{copy.emptyTitle}</p>
          <p className="mt-2 text-sm text-[var(--neutral-11)]">{copy.emptyBody}</p>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
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
    </section>
  );
}
