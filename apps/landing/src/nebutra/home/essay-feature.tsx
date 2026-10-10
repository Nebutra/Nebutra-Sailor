import { resolveBlogCover } from "@nebutra/blog";
import { getImageUrl } from "@nebutra/sanity/image";
import { cacheLife } from "next/cache";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { type BlogPostWithSource, getAllPosts } from "@/lib/blog";

/**
 * The Journal is the site's lead, as a16z's media is its front page. Essays
 * are read live from the CMS and cached hourly.
 */
export const FEATURED = "why-we-build-nebutra";

export async function essays() {
  "use cache";
  cacheLife("hours");
  return getAllPosts("en").catch(() => [] as BlogPostWithSource[]);
}

export function coverOf(post: BlogPostWithSource, width: number, height: number) {
  const imageUrl = post.mainImage
    ? getImageUrl(post.mainImage as Parameters<typeof getImageUrl>[0], {
        width,
        height,
        format: "webp",
      })
    : null;
  return resolveBlogCover(post, { alt: `${post.title} cover`, imageUrl });
}

/** Plain data for client lists — no Sanity objects cross the boundary. */
export interface EssayCardData {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  tags: string[];
  cover: { src: string; alt: string };
}

export function toCard(post: BlogPostWithSource): EssayCardData {
  const c = coverOf(post, 900, 506);
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    date: post.date?.slice(0, 10) ?? "",
    tags: post.tags ?? [],
    cover: { src: c.src, alt: c.alt },
  };
}

/** The thesis essay, large. */
export async function EssayFeature() {
  const posts = await essays();
  const post = posts.find((p) => p.slug === FEATURED) ?? posts[0];
  if (!post) return null;
  const cover = coverOf(post, 1600, 900);
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group grid grid-cols-1 items-end gap-10 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]"
    >
      <div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-xl)] bg-muted">
        <Image
          src={cover.src}
          alt={cover.alt}
          fill
          priority
          sizes="(min-width: 1280px) 55vw, 100vw"
          className="object-cover motion-safe:transition-transform motion-safe:duration-reveal motion-safe:ease-brand group-hover:scale-[1.02]"
        />
      </div>
      <div>
        <p className="text-sm tabular-nums text-muted-foreground">
          Essay · {post.date?.slice(0, 10)}
        </p>
        <p className="mt-3 font-heading text-4xl font-medium text-foreground text-balance">
          {post.title}
        </p>
        <p className="mt-4 text-lg text-muted-foreground">{post.excerpt}</p>
      </div>
    </Link>
  );
}
