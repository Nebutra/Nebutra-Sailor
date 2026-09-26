"use client";

import { motionDurationSec } from "@nebutra/brand";
import { ArrowRight, BookOpen, ChevronDown, Copy, Message } from "@nebutra/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useCopyToClipboard,
} from "@nebutra/ui/primitives";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type BlogHeroTopic = {
  href: string;
  label: string;
};

export type BlogRailPost = {
  dateLabel: string | null;
  href: string;
  id: string;
  readTime: string;
  title: string;
};

type BlogMotionHeroProps = {
  contactHref: string;
  isZh: boolean;
  topics: BlogHeroTopic[];
};

type BlogExploreMenuProps = {
  contactHref: string;
  isZh: boolean;
};

type LatestPostMotionRailProps = {
  isZh: boolean;
  posts: BlogRailPost[];
};

function useAnimationFrame(callback: (deltaMs: number) => void, enabled: boolean) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    let frameId = 0;
    let previousTime = performance.now();

    const tick = (time: number) => {
      const delta = time - previousTime;
      previousTime = time;
      callbackRef.current(delta);
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [enabled]);
}

function BlogExploreMenu({ contactHref, isZh }: BlogExploreMenuProps) {
  // The DS menu, not a hand-rolled absolute panel: it portals past any
  // ancestor stacking context, and owns outside-click, Escape and focus.
  const [open, setOpen] = useState(false);
  const { copied, copy } = useCopyToClipboard({ timeout: 1600, showToast: false });

  async function copyPageAsMarkdown() {
    const title = document.title || (isZh ? "Nebutra 博客" : "Nebutra Blog");
    const href = window.location.href;
    const markdown = `[${title}](${href})`;
    await copy(markdown);
  }

  const itemClass =
    "group flex w-full items-center gap-3 rounded-[calc(var(--radius-xl)-4px)] px-3 py-2.5 text-sm font-medium text-foreground";
  const iconClass =
    "size-4 shrink-0 text-muted-foreground transition-colors group-data-[highlighted]:text-foreground";

  return (
    <div className="flex justify-end">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group inline-flex min-h-10 items-center gap-1.5 rounded-full border border-transparent px-3 text-sm font-medium text-muted-foreground transition-[background-color,color,border-color] duration-[var(--motion-duration-flow)] ease-[var(--ease-out)] hover:border-border hover:bg-muted hover:text-foreground motion-reduce:transition-none"
          >
            {isZh ? "探索此页" : "Explore here"}
            <ChevronDown
              className={`size-3.5 opacity-70 transition-transform duration-[var(--motion-duration-flow)] motion-reduce:transition-none ${
                open ? "-rotate-180" : ""
              }`}
              aria-hidden
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-72 p-2">
          <DropdownMenuItem render={<Link href={contactHref} />} className={itemClass}>
            <Message className={iconClass} aria-hidden />
            {isZh ? "询问这个页面" : "Ask questions about this page"}
          </DropdownMenuItem>
          {/* Stays open so the "Copied" confirmation is seen. */}
          <DropdownMenuItem closeOnClick={false} onClick={copyPageAsMarkdown} className={itemClass}>
            <Copy className={iconClass} aria-hidden />
            {copied ? (isZh ? "已复制" : "Copied") : isZh ? "复制链接" : "Copy link"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function BlogMotionHero({ contactHref, isZh, topics }: BlogMotionHeroProps) {
  return (
    <div className="border-y border-border py-4 sm:py-5">
      <BlogExploreMenu contactHref={contactHref} isZh={isZh} />

      <div className="grid gap-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-16">
        <div className="flex flex-col justify-center gap-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <BookOpen className="size-3.5" aria-hidden />
            {isZh ? "Nebutra Journal · 技术札记" : "Nebutra Journal"}
          </div>
          <h1 className="text-balance text-4xl font-semibold text-foreground tracking-heading sm:text-5xl">
            {isZh ? "工程、产品与治理笔记" : "Notes on engineering, product, and governance"}
          </h1>
          <p className="max-w-xl text-base leading-7 text-muted-foreground">
            {isZh
              ? "少量、认真、可复用的文章：记录 Nebutra 在工程、产品、治理和 AI 原生交付中的真实取舍。"
              : "Sparse, careful writing on Nebutra's engineering, product, governance, and AI-native delivery decisions."}
          </p>
        </div>

        <nav aria-label={isZh ? "博客主题" : "Blog topics"} className="min-w-0">
          <p className="mb-4 text-xs font-semibold uppercase text-muted-foreground">
            {isZh ? "按主题浏览" : "Browse by topic"}
          </p>
          {/*
            At rest every topic sits on the same edge at full strength. Hover
            (or keyboard focus) on the list dims the others and nudges only the
            hovered row's arrow — the text never moves. This used to track an
            "active" index in state that defaulted to the first row and never
            reset on leave, so one row always stood 8px proud of the rest.
          */}
          <div className="group/topics flex flex-col">
            {topics.map((topic) => (
              <Link
                key={topic.label}
                href={topic.href}
                className="group/topic relative -mx-2 rounded-[var(--radius-md)] px-2 py-1.5 transition-opacity duration-[var(--motion-duration-flow)] ease-[var(--ease-out)] motion-reduce:transition-none group-hover/topics:opacity-45 group-has-[:focus-visible]/topics:opacity-45 hover:opacity-100! focus-visible:opacity-100!"
              >
                <span className="flex min-w-0 items-center gap-3 text-3xl font-semibold leading-display text-foreground sm:text-4xl lg:text-5xl">
                  <span className="min-w-0 text-balance">{topic.label}</span>
                  <ArrowRight
                    className="size-8 shrink-0 text-muted-foreground transition-[transform,color] duration-[var(--motion-duration-flow)] ease-[var(--ease-out)] motion-reduce:transition-none group-hover/topic:translate-x-1.5 group-hover/topic:text-foreground group-focus-visible/topic:translate-x-1.5 group-focus-visible/topic:text-foreground sm:size-9 lg:size-10"
                    aria-hidden
                  />
                </span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

function BlogRailPostCard({
  activePostId,
  isVisualDuplicate,
  post,
  setActivePostId,
}: {
  activePostId: string | null;
  isVisualDuplicate: boolean;
  post: BlogRailPost;
  setActivePostId: (id: string) => void;
}) {
  const active = activePostId === post.id;
  const dimmed = activePostId !== null && !active;

  return (
    <article
      className={`min-w-[18rem] max-w-[18rem] border-l border-border px-5 py-6 transition-[opacity,transform] duration-[var(--motion-duration-flow)] ease-[var(--ease-out)] motion-reduce:transition-none sm:min-w-[22rem] sm:max-w-[22rem] ${
        active ? "-translate-y-2" : "translate-y-0"
      } ${dimmed ? "opacity-35" : "opacity-100"}`}
    >
      <Link
        href={post.href}
        tabIndex={isVisualDuplicate ? -1 : undefined}
        aria-hidden={isVisualDuplicate || undefined}
        onFocus={() => setActivePostId(post.id)}
        onPointerEnter={() => setActivePostId(post.id)}
        className="group block h-full rounded-[var(--radius-md)] outline-none"
      >
        <p className="text-xs font-medium text-muted-foreground">{post.dateLabel ?? "Undated"}</p>
        <h2 className="mt-3 line-clamp-3 text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
          {post.title}
        </h2>
        <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {post.readTime}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </article>
  );
}

// Marquee speed in pixels-per-ms, derived from the cinematic motion rail
// (0.5s) rather than a magic number — a slow, ambient drift that reads as
// "alive" without competing for attention.
const RAIL_SPEED_PX_PER_MS = motionDurationSec.cinematic * 0.044;

// How many recent posts the rail surfaces. The page only mounts the rail once
// the library exceeds this count, so "latest" stays a real subset, not a repeat.
// Exported so the index page derives its gate from the same source of truth.
export const RAIL_POST_COUNT = 8;

export function LatestPostMotionRail({ isZh, posts }: LatestPostMotionRailProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [halfWidth, setHalfWidth] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [trackX, setTrackX] = useState(0);
  const railPosts = posts.slice(0, RAIL_POST_COUNT);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const syncWidth = () => setHalfWidth(track.scrollWidth / 2);
    syncWidth();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(syncWidth);
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const running = !reduceMotion && !paused && halfWidth > 0;

  useAnimationFrame((delta) => {
    setTrackX((current) => {
      const next = current - delta * RAIL_SPEED_PX_PER_MS;
      return Math.abs(next) >= halfWidth ? next + halfWidth : next;
    });
  }, running);

  if (railPosts.length === 0) return null;

  const renderedPosts = [...railPosts, ...railPosts];

  return (
    <section
      aria-label={isZh ? "最新文章" : "Latest posts"}
      className="relative left-1/2 w-[100dvw] max-w-[100dvw] -translate-x-1/2 overflow-x-clip overflow-y-hidden border-b border-border"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => {
        setPaused(false);
        setActivePostId(null);
      }}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setPaused(false);
          setActivePostId(null);
        }
      }}
    >
      <div className="border-t border-border" />
      <div className="relative overflow-hidden">
        <div
          ref={trackRef}
          style={{ transform: `translate3d(${trackX}px, 0, 0)` }}
          className="flex w-max will-change-transform motion-reduce:transform-none"
        >
          {renderedPosts.map((post, index) => (
            <BlogRailPostCard
              key={`${post.id}-${index}`}
              activePostId={activePostId}
              isVisualDuplicate={index >= railPosts.length}
              post={post}
              setActivePostId={setActivePostId}
            />
          ))}
        </div>
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-background to-transparent sm:w-24"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-background to-transparent sm:w-24"
        aria-hidden
      />
    </section>
  );
}
