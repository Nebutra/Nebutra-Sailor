import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { SkeletonRows } from "@/components/console-states";
import { PageFrame } from "@/components/page-frame";
import { UsageClient } from "@/components/usage-client";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("console.usage");
  return { title: t("title") };
}

/**
 * 用量 — the ledger, read back.
 *
 * The filters live in the query string, so `UsageClient` reads
 * `useSearchParams` and has to sit behind a Suspense boundary.
 */
export default async function UsagePage() {
  await requireAuth("/usage");
  const t = await getTranslations("console.usage");
  return (
    <PageFrame title={t("title")} description={t("description")}>
      <Suspense fallback={<SkeletonRows rows={6} columns={4} />}>
        <UsageClient />
      </Suspense>
    </PageFrame>
  );
}
