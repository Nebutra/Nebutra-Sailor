import { brand } from "@nebutra/brand/metadata";
import { buildCategoryHub } from "@nebutra/forge-runtime";
import { Section } from "@nebutra/ui/layout";
import { AuroraBackground } from "@nebutra/ui/primitives";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CategoryNav } from "@/components/category-nav";
import { HomeSearch } from "@/components/home-search";
import { PageFrame } from "@/components/page-frame";
import { RootNav } from "@/components/root-nav";
import { ToolCard } from "@/components/tool-card";
import { getForgeRegistry } from "@/lib/registry";

/**
 * Home layout (landing-aligned):
 * 1. Full-bleed hero (no nested card inside padded main)
 * 2. Sticky category rail inside wide frame
 * 3. Category sections with consistent vertical rhythm
 *
 * Copy from apps/forge/messages/<PRODUCT_LANGUAGES key>.json
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: {
      default: t("titleDefault", { brandName: brand.name }),
      template: t("titleTemplate", { brandName: brand.name }),
    },
    description: t("description"),
  };
}

export default async function ForgeHomePage() {
  const registry = getForgeRegistry();
  const hub = buildCategoryHub(registry);
  const t = await getTranslations("home");
  const tCat = await getTranslations("categories");

  return (
    <>
      <section className="relative w-full overflow-hidden border-b border-[var(--neutral-6)]">
        <AuroraBackground variant="subtle" position="top" intensity={0.28} />
        <PageFrame className="relative z-10 py-16 text-center md:py-24 lg:py-28">
          {/*
            w-full on the column + text blocks: CJK body styles must never
            shrink flex items to min-content (one glyph) under items-center.
          */}
          <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col items-center gap-5 sm:gap-6">
            <p className="w-full text-xs font-medium tracking-[0.12em] text-[var(--neutral-11)] uppercase">
              {t("eyebrow")}
            </p>
            <h1
              className="w-full text-balance text-3xl font-semibold text-[var(--neutral-12)] sm:text-4xl md:text-5xl lg:text-6xl"
              style={{
                letterSpacing: "var(--tracking-display, -0.02em)",
                lineHeight: "var(--leading-display, 1.1)",
              }}
            >
              {t("title")}
            </h1>
            <p className="w-full max-w-xl text-sm leading-relaxed text-[var(--neutral-11)] sm:text-base md:text-[17px] md:leading-relaxed">
              {t("subtitle")}
            </p>
            <p className="flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-[var(--neutral-10)]">
              <span className="tabular-nums">{t("toolCount", { count: hub.tools.length })}</span>
              <span
                className="hidden h-1 w-1 rounded-full bg-[var(--neutral-7)] sm:inline-block"
                aria-hidden
              />
              <span>{t("apiMcp")}</span>
            </p>
            <div className="w-full max-w-xl pt-2">
              <HomeSearch tools={hub.tools} />
            </div>
          </div>
        </PageFrame>
      </section>

      <PageFrame className="pb-20 pt-8 md:pb-24 md:pt-10">
        <div className="space-y-6">
          <RootNav tools={hub.tools} />
          <CategoryNav categories={hub.categories.map((c) => c.id)} />
        </div>

        <div className="mt-10 space-y-16 md:mt-12 md:space-y-20">
          {hub.categories.map((cat) => {
            const label = tCat.has(`${cat.id}.label` as never)
              ? tCat(`${cat.id}.label` as never)
              : cat.id;
            const hint = tCat.has(`${cat.id}.hint` as never) ? tCat(`${cat.id}.hint` as never) : "";
            return (
              <Section key={cat.id} label={label} className="scroll-mt-28 space-y-5 !py-0">
                <div id={cat.id} className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-[var(--neutral-12)]">
                      {label}
                    </h2>
                    {hint ? <p className="mt-1 text-sm text-[var(--neutral-11)]">{hint}</p> : null}
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
