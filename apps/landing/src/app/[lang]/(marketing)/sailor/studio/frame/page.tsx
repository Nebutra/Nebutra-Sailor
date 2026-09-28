import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { StudioFrame } from "@/nebutra/studio/studio-frame";

export const metadata: Metadata = {
  title: "Sailor Studio — catalog frame",
  robots: { index: false, follow: false },
};

/**
 * The document Sailor Studio's Components view renders in (frame-protocol.ts).
 * Bare — no rail — and never indexed: it is part of the Studio page, not a page.
 */
export default async function StudioFramePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang);
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <StudioFrame />
    </main>
  );
}
