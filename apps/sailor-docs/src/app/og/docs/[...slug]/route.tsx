import { ImageResponse } from "@takumi-rs/image-response";
import { generate as DefaultImage } from "fumadocs-ui/og/takumi";
import { notFound } from "next/navigation";
import { getPageImage, source } from "@/lib/source";

export const revalidate = false;

interface RouteContext {
  params: Promise<{ slug: string[] }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { slug } = await params;

  // The client requested `/[lang]/docs/something/image.webp`
  // Slug comes array-like: e.g. ["zh", "components", "image.webp"]
  // So we pop the "image.webp" out to find the actual page.
  const pageSlug = slug.slice(0, -1);
  const lang = pageSlug[0]; // e.g. "zh"
  const restSlug = pageSlug.slice(1);

  const page = source.getPage(restSlug, lang);

  if (!page) notFound();

  return new ImageResponse(
    <DefaultImage
      title={page.data.title}
      description={page.data.description}
      site="Nebutra Sailor"
    />,
    {
      width: 1200,
      height: 630,
      format: "webp",
    },
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    slug: getPageImage(page).segments,
  }));
}
