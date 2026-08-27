import type { Metadata } from "next";
import { connection } from "next/server";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { StatusPageSkeleton, StatusPageView } from "@/components/status/status-page-view";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getStatusSnapshot } from "@/lib/status-checks";

/**
 * `/status` is registered `ui`, so the sitemap publishes it as a distinct
 * localized document in every route locale. The previous cross-origin canonical
 * to status.nebutra.com contradicted that outright: 34 published URLs all
 * declaring a different host as their canonical, and — because setting the
 * `alternates` key replaces the layout's wholesale — no hreflang at all. This
 * page renders its own live snapshot from `getStatusSnapshot`, so it is its own
 * document; the external status host is linked from the body, not canonicalized
 * to. Locale now comes from params, which a no-arg generateMetadata could not
 * see.
 *
 * UI follows the Atlassian Statuspage information architecture used by GitHub,
 * Cloudflare, DigitalOcean, et al.: overall banner → component rows with 90-day
 * strips → maintenance → past incidents. Marketing chrome is intentionally
 * stripped so the page reads as a trust surface, not a landing section.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return buildPageMetadata({
    title: "Nebutra Status",
    description: "Live operational status for Nebutra public services.",
    path: "/status",
    locale: lang as Locale,
  });
}

export default async function StatusPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  return (
    <Suspense fallback={<StatusPageSkeleton />}>
      <StatusPageContent />
    </Suspense>
  );
}

async function StatusPageContent() {
  await connection();
  const snapshot = await getStatusSnapshot();
  return <StatusPageView snapshot={snapshot} />;
}
