import type { Metadata } from "next";
import { pageMetadata, StatusRoute } from "@/components/routes";
import { getSnapshot } from "@/lib/data";
import type { SlugProps } from "@/lib/page-params";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: SlugProps): Promise<Metadata> {
  const { slug } = await params;
  return pageMetadata(await getSnapshot(slug));
}

export default async function StatusPage({ params, searchParams }: SlugProps) {
  const { slug } = await params;
  return <StatusRoute slug={slug} query={await searchParams} path={`/p/${slug}`} />;
}
