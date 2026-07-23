import { Card, PageHeader } from "@nebutra/ui/layout";
import { Button } from "@nebutra/ui/primitives";
import Link from "next/link";
import { PageFrame } from "@/components/page-frame";
import { getModelRoutes } from "@/lib/demo-store";

export const metadata = { title: "模型" };

export default function ModelsPage() {
  const models = getModelRoutes();
  return (
    <PageFrame>
      <div className="space-y-6">
        <PageHeader
          title="模型目录"
          description="客户只见 public model id；背后按 priority 走 New-API / Sub2API 侧车。可用 NEBUTRA_MODEL_ALIASES 覆盖默认别名。"
        />
        <Card className="divide-y divide-[var(--neutral-6)] overflow-hidden border-[var(--neutral-6)] p-0">
          {models.map((m) => (
            <div
              key={m.publicModel}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-2">
                <p className="font-mono text-sm font-semibold tracking-tight">{m.publicModel}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-[var(--neutral-10)]">
                  {m.routes.map((r) => (
                    <span key={`${r.engineId}-${r.upstreamModel}-${r.priority}`}>
                      p{r.priority} · {r.engineId} → {r.upstreamModel}
                    </span>
                  ))}
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/playground?model=${encodeURIComponent(m.publicModel)}`}>
                  Playground
                </Link>
              </Button>
            </div>
          ))}
        </Card>
        {models.length === 0 ? (
          <p className="text-sm text-[var(--neutral-11)]">暂无已配置的 public model。</p>
        ) : null}
      </div>
    </PageFrame>
  );
}
