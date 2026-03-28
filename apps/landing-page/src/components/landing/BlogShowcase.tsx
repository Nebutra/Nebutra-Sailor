"use client";

import { ArrowRight } from "@nebutra/icons";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { BlogPost } from "@/lib/blog-fallback";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";

export interface BlogShowcaseProps {
  posts: BlogPost[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function BlogShowcase({ posts }: BlogShowcaseProps) {
  const t = useTranslations("blogShowcase");

  if (posts.length === 0) return null;

  return (
    <section className="w-full py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        {/* Section header */}
        <AnimateIn inView preset="emerge" className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-bold tracking-[0.2em] text-primary uppercase">
            {t("badge")}
          </p>
          <h2 className="text-4xl font-black tracking-tight text-foreground md:text-5xl text-balance">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{t("subtitle")}</p>
        </AnimateIn>

        {/* Post cards */}
        <AnimateInGroup inView stagger="normal" className="mt-16 grid gap-6 md:grid-cols-3">
          {posts.slice(0, 3).map((post) => (
            <AnimateIn key={post.slug} preset="fadeUp">
              <a
                href={`/blog/${post.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border/50 bg-background/50 backdrop-blur-xl transition-all hover:bg-muted/40 hover:border-primary/20 shadow-xl shadow-primary/5"
              >
                {/* Thumbnail */}
                {post.imageUrl ? (
                  <div className="relative h-48 w-full overflow-hidden bg-[var(--neutral-3)]">
                    <Image
                      src={post.imageUrl}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div
                    className="h-48 w-full transition-opacity group-hover:opacity-90"
                    style={{ background: "var(--brand-gradient)" }}
                    aria-hidden="true"
                  />
                )}

                <div className="flex flex-1 flex-col p-6">
                  <time
                    dateTime={post.date}
                    className="text-xs font-medium text-muted-foreground/80"
                  >
                    {formatDate(post.date)}
                  </time>

                  <h3 className="mt-2 text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>

                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                    {post.excerpt}
                  </p>

                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {t("readMore")}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </a>
            </AnimateIn>
          ))}
        </AnimateInGroup>
      </div>
    </section>
  );
}

BlogShowcase.displayName = "BlogShowcase";
