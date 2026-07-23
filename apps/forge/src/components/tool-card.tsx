import type { ForgeToolSummary } from "@nebutra/forge-runtime";
import { ArrowRight } from "@nebutra/icons";
import { Card } from "@nebutra/ui/layout";
import { Badge } from "@nebutra/ui/primitives";
import Link from "next/link";
import { categoryMeta } from "@/lib/category-meta";

export function ToolCard({ tool }: { tool: ForgeToolSummary }) {
  const cat = categoryMeta(tool.category);
  return (
    <Link href={tool.path} className="group block h-full">
      <Card
        isInteractive
        className="flex h-full flex-col border-border/80 p-5 transition duration-200 group-hover:-translate-y-0.5 group-hover:border-[color-mix(in_srgb,var(--blue-9)_30%,var(--neutral-7))] group-hover:shadow-md"
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <Badge variant="gray-subtle" className="text-[10px] font-medium">
            {cat.label}
          </Badge>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
        </div>
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
          {tool.title.zh}
        </h2>
        <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          {tool.description.zh}
        </p>
        <p className="mt-4 truncate font-mono text-[11px] text-muted-foreground/80">
          {tool.engine.name}
        </p>
      </Card>
    </Link>
  );
}
