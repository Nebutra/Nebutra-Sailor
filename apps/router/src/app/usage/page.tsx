import { Suspense } from "react";
import { SkeletonRows } from "@/components/console-states";
import { PageFrame } from "@/components/page-frame";
import { UsageClient } from "@/components/usage-client";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "用量" };

/**
 * 用量 — the ledger, read back.
 *
 * The filters live in the query string, so `UsageClient` reads
 * `useSearchParams` and has to sit behind a Suspense boundary.
 */
export default async function UsagePage() {
  await requireAuth("/usage");
  return (
    <PageFrame
      title="用量"
      description="花费、Token 与每一次请求的明细。时间窗口按 UTC 计算，与每日额度的重置时刻一致。"
    >
      <Suspense fallback={<SkeletonRows rows={6} columns={4} />}>
        <UsageClient />
      </Suspense>
    </PageFrame>
  );
}
