import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ChatInterface } from "@/components/soul/chat-interface";
import { seoFor } from "@/lib/seo/alternates";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "soul" });

  return {
    title: t("metadata_title"),
    description: t("metadata_desc"),
    robots: { index: false, follow: false },
    openGraph: {
      images: [
        `/og?title=${encodeURIComponent(t("metadata_title"))}&subtitle=${encodeURIComponent(t("metadata_desc"))}`,
      ],
    },
    ...seoFor("/soul", locale, "ui"),
  };
}

export default async function SoulPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "soul" });

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-12 md:py-24 flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Page header */}
      <div className="mb-12">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-foreground/50">
          {t("page_label")}
        </p>
        <div className="flex items-baseline gap-4 mb-3">
          <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
            {t("page_headline")}
          </h1>
          <span className="font-mono flex items-center gap-2 text-[10px] uppercase tracking-widest text-foreground/50">
            <span className="animate-[pulse_1s_steps(2,start)_infinite] opacity-60">{">_"}</span>
            {t("status")}
          </span>
        </div>
        <p className="max-w-2xl text-base text-muted-foreground leading-relaxed">
          {t("page_desc")}
        </p>
      </div>

      {/* Chat container */}
      <div className="flex-1 w-full relative">
        <ChatInterface />
      </div>
    </section>
  );
}
