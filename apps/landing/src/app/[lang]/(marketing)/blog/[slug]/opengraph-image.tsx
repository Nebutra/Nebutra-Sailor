import { resolveBlogCover, toBlogLanguage } from "@nebutra/blog";
import { brand } from "@nebutra/brand/metadata";
import { getImageUrl } from "@nebutra/sanity/image";
import { ImageResponse } from "next/og";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { getPostBySlug } from "@/lib/blog";
import { isZhUiLocale } from "@/lib/i18n/localized";
import { getSiteUrl } from "@/lib/seo/site-routes";

type Params = { lang: string; slug: string };

export const alt = `${brand.name} Blog`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<Params> }) {
  const { lang, slug } = await params;
  const baseUrl = getSiteUrl();
  const post = hasLocale(routing.locales, lang)
    ? await getPostBySlug(slug, toBlogLanguage(lang))
    : null;

  const imageUrl = post?.mainImage
    ? getImageUrl(post.mainImage as Parameters<typeof getImageUrl>[0], {
        width: 1200,
        height: 630,
        format: "webp",
      })
    : null;
  const cover = post
    ? resolveBlogCover(post, {
        alt: `${post.title} cover`,
        imageUrl: imageUrl ?? undefined,
      })
    : null;
  const coverSrc = cover?.src.startsWith("/") ? `${baseUrl}${cover.src}` : cover?.src;
  const isZh = isZhUiLocale(lang);

  return new ImageResponse(
    <div
      style={{
        background: "#faf9f5",
        color: "#141413",
        display: "flex",
        height: "100%",
        padding: 44,
        width: "100%",
      }}
    >
      <div
        style={{
          border: "1px solid rgba(20,20,19,0.16)",
          display: "flex",
          height: "100%",
          overflow: "hidden",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: "0 0 46%",
            position: "relative",
          }}
        >
          {coverSrc ? (
            // biome-ignore lint/performance/noImgElement: next/og ImageResponse requires raw img elements for Satori rendering.
            <img
              alt={cover?.alt ?? ""}
              src={coverSrc}
              style={{ height: "100%", objectFit: "cover", width: "100%" }}
            />
          ) : (
            <div style={{ background: "#e8e6dc", height: "100%", width: "100%" }} />
          )}
        </div>
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "52px 56px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                color: "#6b6a64",
                fontSize: 24,
                textTransform: "uppercase",
              }}
            >
              {brand.name} Originals
            </div>
            <div
              style={{
                fontSize: post?.language === "zh" ? 58 : 62,
                fontWeight: 700,
                lineHeight: 1.05,
                marginTop: 34,
              }}
            >
              {post?.title ?? `${brand.name} Blog`}
            </div>
            {post?.excerpt && (
              <div
                style={{
                  color: "#4b5563",
                  fontSize: 25,
                  lineHeight: 1.4,
                  marginTop: 24,
                }}
              >
                {post.excerpt}
              </div>
            )}
          </div>
          <div
            style={{
              alignItems: "center",
              borderTop: "1px solid rgba(20,20,19,0.14)",
              color: "#6b6a64",
              display: "flex",
              fontSize: 22,
              justifyContent: "space-between",
              paddingTop: 22,
            }}
          >
            <span>{isZh ? "面向 AI SaaS 的工程笔记" : "Engineering notes for AI SaaS"}</span>
            <span>{brand.domains.landing}</span>
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
