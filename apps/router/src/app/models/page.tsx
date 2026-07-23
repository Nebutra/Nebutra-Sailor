import { Card, PageHeader } from "@nebutra/ui/layout";
import { Badge, Button } from "@nebutra/ui/primitives";
import Link from "next/link";
import { getModelRoutes } from "@/lib/demo-store";

export const metadata = { title: "模型" };

export default function ModelsPage() {
  const models = getModelRoutes();
  return (
    <div className="space-y-6">
      <PageHeader
        title="模型目录"
        description="客户只见 public model id；背后按 priority 走 New-API / Sub2API 侧车。可用 NEBUTRA_MODEL_ALIASES 覆盖默认别名。"
      />
      <Card className="divide-y divide-border overflow-hidden border-border/80 p-0">
        {models.map((m) => (
          <div
            key={m.publicModel}
            className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-2">
              <p className="font-mono text-sm font-semibold tracking-tight">{m.publicModel}</p>
              <div className="flex flex-wrap gap-1.5">
                {m.routes.map((r) => (
                  <Badge
                    key={`${r.engineId}-${r.upstreamModel}-${r.priority}`}
                    variant="gray-subtle"
                    className="font-mono text-[11px]"
                  >
                    p{r.priority} · {r.engineId} → {r.upstreamModel}
                  </Badge>
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
        <p className="text-sm text-muted-foreground">暂无已配置的 public model。</p>
      ) : null}
    </div>
  );
}
