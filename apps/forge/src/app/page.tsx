import { buildCategoryHub } from "@nebutra/forge-runtime";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { AuroraBackground, Badge } from "@nebutra/ui/primitives";
import { CategoryNav } from "@/components/category-nav";
import { HomeSearch } from "@/components/home-search";
import { ToolCard } from "@/components/tool-card";
import { categoryMeta } from "@/lib/category-meta";
import { getForgeRegistry } from "@/lib/registry";

export default function ForgeHomePage() {
  const registry = getForgeRegistry();
  const hub = buildCategoryHub(registry);

  return (
    <div className="space-y-14 pb-10">
      <section className="relative overflow-hidden rounded-[var(--radius-xl,1.5rem)] border border-border bg-background">
        <AuroraBackground variant="vivid" position="top" intensity={0.55} />
        <div className="relative z-10 px-6 py-14 text-center md:px-14 md:py-20">
          <AnimateInGroup stagger="normal" className="mx-auto max-w-2xl space-y-6">
            <AnimateIn preset="fadeUp">
              <Badge variant="blue-subtle" className="px-3 py-1 text-[11px]">
                给人用 · 也给 Agent 用
              </Badge>
            </AnimateIn>
            <AnimateIn preset="fadeUp">
              <h1
                className="text-4xl font-semibold tracking-tight text-balance md:text-5xl lg:text-6xl"
                style={{
                  letterSpacing: "var(--tracking-display, -0.02em)",
                  lineHeight: "var(--leading-display, 1.1)",
                }}
              >
                <span className="text-primary">在线工具瑞士军刀</span>
              </h1>
            </AnimateIn>
            <AnimateIn preset="fadeUp">
              <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                编解码、文本、哈希、文档、图片——页面上点一点就好用； 同一能力也能被 Agent 通过 API /
                MCP 调用。
              </p>
            </AnimateIn>
            <AnimateIn preset="fadeUp">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge variant="gray-subtle">{hub.tools.length} 个工具</Badge>
                <Badge variant="gray-subtle">人机同一接口</Badge>
              </div>
            </AnimateIn>
            <AnimateIn preset="fadeUp">
              <div className="pt-2">
                <HomeSearch tools={hub.tools} />
              </div>
            </AnimateIn>
          </AnimateInGroup>
        </div>
      </section>

      <CategoryNav categories={hub.categories.map((c) => c.id)} />

      {hub.categories.map((cat) => {
        const meta = categoryMeta(cat.id);
        return (
          <section key={cat.id} id={cat.id} className="scroll-mt-28 space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">{meta.label}</h2>
                {meta.hint ? (
                  <p className="mt-1 text-sm text-muted-foreground">{meta.hint}</p>
                ) : null}
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">{cat.tools.length}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {cat.tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
