import { AnimateIn } from "@nebutra/ui/components";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GuestbookClient } from "@/components/guestbook/guestbook-client";
import { prisma } from "@/lib/prisma";

type GuestbookEntry = {
  id: string;
  authorName: string;
  authorImage: string | null;
  nickname: string;
  relationship: string;
  company: string | null;
  title: string | null;
  message: string;
  createdAt: Date;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.guestbook" });
  return {
    title: t("metadata_title"),
    description: t("metadata_desc"),
    openGraph: {
      images: [
        `/og?title=${encodeURIComponent(t("metadata_title"))}&subtitle=${encodeURIComponent(t("metadata_desc"))}`,
      ],
    },
    alternates: {
      canonical: `https://tsekaluk.dev/${locale}/guestbook`,
      languages: {
        en: "https://tsekaluk.dev/en/guestbook",
        zh: "https://tsekaluk.dev/zh/guestbook",
        ja: "https://tsekaluk.dev/ja/guestbook",
      },
    },
  };
}

export default async function GuestbookPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.guestbook" });

  const rawEntries: GuestbookEntry[] = prisma
    ? await prisma.guestbook
        .findMany({
          where: { status: "approved" },
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true,
            authorName: true,
            authorImage: true,
            nickname: true,
            relationship: true,
            company: true,
            title: true,
            message: true,
            createdAt: true,
          },
        })
        .catch((_err: unknown) => {
          return [] as GuestbookEntry[];
        })
    : [];

  // Serialize dates to strings for proper Client Component hydration
  const initialEntries = rawEntries.map((entry) => ({
    ...entry,
    createdAt: entry.createdAt.toISOString(),
  }));

  return (
    <section className="mx-auto max-w-4xl px-6 py-24 md:py-32">
      <div className="mb-20 text-center max-w-2xl mx-auto">
        <AnimateIn preset="fade">
          <p className="font-serif italic text-lg text-gray-500/80 dark:text-gray-400/80">
            {t("label")}
          </p>
        </AnimateIn>
        <AnimateIn preset="fadeUp" delay={0.1}>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-black to-black/70 dark:from-white dark:to-white/70 md:text-5xl lg:text-6xl">
            {t("headline")}
          </h1>
        </AnimateIn>
        <AnimateIn preset="fadeUp" delay={0.2}>
          <p className="mt-6 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
            {t("description")}
          </p>
        </AnimateIn>
      </div>

      <GuestbookClient initialEntries={initialEntries} />
    </section>
  );
}
