"use client";

import { brandEasing, motionDurationSec } from "@nebutra/brand";
import { ArrowRight, BookOpen, ChevronDown, Copy, Message } from "@nebutra/icons";
import {
  AnimatePresence,
  m,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

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

const stateTransition = {
  duration: motionDurationSec.flow,
  ease: brandEasing.brand,
} as const;

const menuTransition = {
  duration: motionDurationSec.reveal,
  ease: brandEasing.brand,
} as const;

function BlogExploreMenu({ contactHref, isZh }: BlogExploreMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function copyPageAsMarkdown() {
    const title = document.title || (isZh ? "Nebutra 博客" : "Nebutra Blog");
    const href = window.location.href;
    const markdown = `[${title}](${href})`;

    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div ref={menuRef} className="relative z-20 flex justify-end">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="group inline-flex min-h-10 items-center gap-1.5 rounded-full border border-transparent px-3 text-sm font-medium text-[var(--neutral-11)] transition-[background-color,color,border-color] duration-[var(--motion-duration-flow)] ease-[var(--ease-out)] hover:border-[var(--neutral-6)] hover:bg-[var(--neutral-2)] hover:text-[var(--neutral-12)] motion-reduce:transition-none"
      >
        {isZh ? "探索此页" : "Explore here"}
        <ChevronDown
          className={`size-3.5 opacity-70 transition-transform duration-[var(--motion-duration-flow)] motion-reduce:transition-none ${
            open ? "-rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      <AnimatePresence>
        {open ? (
          <m.div
            id={menuId}
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={menuTransition}
            className="absolute right-0 top-full mt-2 w-72 rounded-[var(--radius-xl)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-2 shadow-[var(--shadow-lg)]"
          >
            <Link
              href={contactHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="group flex w-full items-center gap-3 rounded-[calc(var(--radius-xl)-4px)] px-3 py-2.5 text-left text-sm font-medium text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-3)]"
            >
              <Message
                className="size-4 shrink-0 text-[var(--neutral-10)] transition-colors group-hover:text-[var(--blue-9)]"
                aria-hidden
              />
              {isZh ? "询问这个页面" : "Ask questions about this page"}
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={copyPageAsMarkdown}
              className="group flex w-full items-center gap-3 rounded-[calc(var(--radius-xl)-4px)] px-3 py-2.5 text-left text-sm font-medium text-[var(--neutral-12)] transition-colors hover:bg-[var(--neutral-3)]"
            >
              <Copy
                className="size-4 shrink-0 text-[var(--neutral-10)] transition-colors group-hover:text-[var(--blue-9)]"
                aria-hidden
              />
              {copied
                ? isZh
                  ? "已复制"
                  : "Copied"
                : isZh
                  ? "复制为 Markdown"
                  : "Copy as markdown"}
            </button>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function BlogMotionHero({ contactHref, isZh, topics }: BlogMotionHeroProps) {
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);

  return (
    <div className="border-y border-[var(--neutral-6)] py-4 sm:py-5">
      <BlogExploreMenu contactHref={contactHref} isZh={isZh} />

      <div className="grid gap-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-16">
        <div className="flex flex-col justify-center gap-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--neutral-2)] px-3 py-1 text-xs font-medium text-[var(--neutral-11)]">
            <BookOpen className="size-3.5" aria-hidden />
            {isZh ? "Nebutra 技术博客" : "Nebutra Journal"}
          </div>
          <h1 className="text-balance text-4xl font-semibold text-[var(--neutral-12)] sm:text-5xl">
            {isZh ? "工程、产品与治理笔记" : "Notes on engineering, product, and governance"}
          </h1>
          <p className="max-w-xl text-base leading-7 text-[var(--neutral-11)]">
            {isZh
              ? "少量、认真、可复用的文章：记录 Nebutra 在工程、产品、治理和 AI 原生交付中的真实取舍。"
              : "Sparse, careful writing on Nebutra's engineering, product, governance, and AI-native delivery decisions."}
          </p>
        </div>

        <nav aria-label={isZh ? "博客主题" : "Blog topics"} className="min-w-0">
          <p className="mb-4 text-xs font-semibold uppercase text-[var(--neutral-10)]">
            {isZh ? "按主题浏览" : "Browse by topic"}
          </p>
          <div className="flex flex-col">
            {topics.map((topic, index) => {
              const active = index === activeTopicIndex;
              return (
                <Link
                  key={topic.label}
                  href={topic.href}
                  onFocus={() => setActiveTopicIndex(index)}
                  onPointerEnter={() => setActiveTopicIndex(index)}
                  className="group relative -mx-2 rounded-[var(--radius-md)] px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-8)]"
                >
                  <m.span
                    animate={{ opacity: active ? 1 : 0.36, x: active ? 0 : -8 }}
                    transition={stateTransition}
                    className="flex min-w-0 items-center gap-3 text-3xl font-semibold leading-[1.05] text-[var(--neutral-12)] sm:text-4xl lg:text-5xl"
                  >
                    <span className="min-w-0 text-balance">{topic.label}</span>
                    <m.span
                      animate={{ opacity: active ? 1 : 0.5, x: active ? 6 : 0 }}
                      transition={stateTransition}
                      className="shrink-0"
                    >
                      <ArrowRight className="size-8 sm:size-9 lg:size-10" aria-hidden />
                    </m.span>
                  </m.span>
                </Link>
              );
            })}
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
    <m.article
      animate={{
        opacity: dimmed ? 0.34 : 1,
        y: active ? -8 : 0,
      }}
      transition={stateTransition}
      className="min-w-[18rem] max-w-[18rem] border-l border-[var(--neutral-6)] px-5 py-6 sm:min-w-[22rem] sm:max-w-[22rem]"
    >
      <Link
        href={post.href}
        tabIndex={isVisualDuplicate ? -1 : undefined}
        aria-hidden={isVisualDuplicate || undefined}
        onFocus={() => setActivePostId(post.id)}
        onPointerEnter={() => setActivePostId(post.id)}
        className="group block h-full rounded-[var(--radius-md)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-8)]"
      >
        <p className="text-xs font-medium text-[var(--neutral-10)]">
          {post.dateLabel ?? "Undated"}
        </p>
        <h2 className="mt-3 line-clamp-3 text-lg font-semibold leading-snug text-[var(--neutral-12)] transition-colors group-hover:text-[var(--blue-9)]">
          {post.title}
        </h2>
        <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--neutral-10)]">
          {post.readTime}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </m.article>
  );
}

export function LatestPostMotionRail({ isZh, posts }: LatestPostMotionRailProps) {
  const shouldReduce = useReducedMotion();
  const x = useMotionValue(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [halfWidth, setHalfWidth] = useState(0);
  const [paused, setPaused] = useState(false);
  const railPosts = posts.slice(0, 8);

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

  useAnimationFrame((_, delta) => {
    if (shouldReduce || paused || halfWidth <= 0) return;

    const next = x.get() - delta * 0.022;
    x.set(Math.abs(next) >= halfWidth ? next + halfWidth : next);
  });

  if (railPosts.length === 0) return null;

  const renderedPosts = [...railPosts, ...railPosts];

  return (
    <section
      aria-label={isZh ? "最新文章" : "Latest posts"}
      className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden border-b border-[var(--neutral-6)]"
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
      <div className="border-t border-[var(--neutral-6)]" />
      <div className="relative overflow-hidden">
        <m.div
          ref={trackRef}
          style={{ x }}
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
        </m.div>
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-[var(--neutral-1)] to-transparent sm:w-24"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-[var(--neutral-1)] to-transparent sm:w-24"
        aria-hidden
      />
    </section>
  );
}
