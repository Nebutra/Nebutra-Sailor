import { buildCategoryHub } from "@nebutra/forge-runtime";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Section } from "@nebutra/ui/layout";
import { AuroraBackground } from "@nebutra/ui/primitives";
import { CategoryNav } from "@/components/category-nav";
import { HomeSearch } from "@/components/home-search";
import { PageFrame } from "@/components/page-frame";
import { ToolCard } from "@/components/tool-card";
import { categoryMeta } from "@/lib/category-meta";
import { getForgeRegistry } from "@/lib/registry";

/**
 * Home layout (landing-aligned):
 * 1. Full-bleed hero (no nested card inside padded main)
 * 2. Sticky category rail inside wide frame
 * 3. Category sections with consistent vertical rhythm
 */
export default function ForgeHomePage() {
  const registry = getForgeRegistry();
  const hub = buildCategoryHub(registry);

  return (
    <>
      {/* —— Hero: full-bleed; H1 neutral (landing), aurora subtle —— */}
      <section className="relative w-full overflow-hidden border-b border-[var(--neutral-6)]">
        <AuroraBackground variant="subtle" position="top" intensity={0.28} />
        <PageFrame className="relative z-10 py-16 text-center md:py-24 lg:py-28">
          <AnimateInGroup
            stagger="normal"
            className="mx-auto flex max-w-2xl flex-col items-center gap-6"
          >
            <AnimateIn preset="fadeUp">
              <p className="text-xs font-medium tracking-[0.12em] text-[var(--neutral-11)] uppercase">
                所见即可调用
              </p>
            </AnimateIn>
            <AnimateIn preset="fadeUp">
              {/* Product H1: near-black, not full-line brand blue (VI: gradient is logo-only) */}
              <h1
                className="text-4xl font-semibold text-balance text-[var(--neutral-12)] md:text-5xl lg:text-6xl"
                style={{
                  letterSpacing: "var(--tracking-display, -0.02em)",
                  lineHeight: "var(--leading-display, 1.1)",
                }}
              >
                在线工具瑞士军刀
              </h1>
            </AnimateIn>
            <AnimateIn preset="fadeUp">
              <p className="max-w-xl text-base leading-relaxed text-[var(--neutral-11)] md:text-[17px] md:leading-relaxed">
                编解码、文本、哈希、文档与图片处理。页面上手动完成，或经 API / MCP
                接入自动化——能力只实现一次。
              </p>
            </AnimateIn>
            <AnimateIn preset="fadeUp">
              <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-[var(--neutral-10)]">
                <span className="tabular-nums">{hub.tools.length} 个工具</span>
                <span
                  className="hidden h-1 w-1 rounded-full bg-[var(--neutral-7)] sm:inline-block"
                  aria-hidden
                />
                <span>API / MCP</span>
              </p>
            </AnimateIn>
            <AnimateIn preset="fadeUp">
              <div className="w-full max-w-xl pt-2">
                <HomeSearch tools={hub.tools} />
              </div>
            </AnimateIn>
          </AnimateInGroup>
        </PageFrame>
      </section>

      {/* —— Catalog —— */}
      <PageFrame className="pb-20 pt-8 md:pb-24 md:pt-10">
        <CategoryNav categories={hub.categories.map((c) => c.id)} />

        <div className="mt-10 space-y-16 md:mt-12 md:space-y-20">
          {hub.categories.map((cat) => {
            const meta = categoryMeta(cat.id);
            return (
              <Section key={cat.id} label={meta.label} className="scroll-mt-28 space-y-5 !py-0">
                <div id={cat.id} className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-[var(--neutral-12)]">
                      {meta.label}
                    </h2>
                    {meta.hint ? (
                      <p className="mt-1 text-sm text-[var(--neutral-11)]">{meta.hint}</p>
                    ) : null}
                  </div>
                  <span className="text-xs tabular-nums text-[var(--neutral-10)]">
                    {cat.tools.length}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {cat.tools.map((tool) => (
                    <ToolCard key={tool.id} tool={tool} />
                  ))}
                </div>
              </Section>
            );
          })}
        </div>
      </PageFrame>
    </>
  );
}
