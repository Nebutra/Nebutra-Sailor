import type { Metadata } from "next";
import { seoFor } from "@/lib/seo/alternates";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const titles: Record<string, string> = {
    en: "Uses — Tseka Luk",
    zh: "工具 — Tseka Luk",
    ja: "ツール — Tseka Luk",
  };
  const descs: Record<string, string> = {
    en: "Hardware, software, and AI tools I use to build products.",
    zh: "我日常使用的硬件、软件和 AI 工具。",
    ja: "プロダクト開発に使うハードウェア・ソフトウェア・AI ツール。",
  };

  const title = titles[locale] ?? titles.en;
  const description = descs[locale] ?? descs.en;

  return {
    title,
    description,
    openGraph: {
      images: [
        `/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(description)}`,
      ],
    },
    ...seoFor("/uses", locale, "ui"),
  };
}

export default function UsesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
