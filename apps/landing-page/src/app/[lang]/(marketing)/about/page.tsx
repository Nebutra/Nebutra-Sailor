import { LogomarkSVG } from "@nebutra/brand";
import { ArrowRight } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Button } from "@nebutra/ui/primitives";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { Link } from "@/i18n/navigation";

import type { Locale } from "@/i18n/routing";

import {
  CORE_QUOTE,
  META_UNICORN_THESIS,
  OMNI_FACTOR_GROUPS,
  pick,
  TRIPLE_VISION,
} from "./_about-data";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  const t = await getTranslations({ locale: lang as Locale, namespace: "legalPages.about" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function AboutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  const t = await getTranslations({ locale: lang as Locale, namespace: "legalPages.about" });

  const valueImages = [
    "/images/about/agi-premium.png",
    "/images/about/security-premium.png",
    "/images/about/ergonomics-premium.png",
    "/images/about/scale-premium.png",
  ];

  return (
    <main id="main-content" className="flex flex-col min-h-screen bg-background">
      <Navbar />

      {/* 1. Hero Section (Asymmetrical Text + Abstract Art) */}
      <section className="pt-32 md:pt-48 pb-20 overflow-hidden">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* Text Content */}
            <div className="flex-1 w-full text-left">
              <span className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-8 block">
                {t("title").split("—")[0].trim()}
              </span>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-balance mb-8">
                {t("heading")}
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-xl">
                {t("subheading")}
              </p>
              <figure className="mt-10 max-w-xl border-l-2 border-foreground pl-4">
                <blockquote className="text-base md:text-lg text-foreground leading-relaxed text-balance">
                  {pick(lang, CORE_QUOTE).text}
                </blockquote>
                <figcaption className="mt-3 text-xs font-mono tracking-widest uppercase text-muted-foreground">
                  {pick(lang, CORE_QUOTE).attribution}
                </figcaption>
              </figure>
            </div>
            {/* Image */}
            <div className="flex-1 w-full">
              <div className="relative aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden bg-muted/30 shadow-2xl">
                <Image
                  src="/images/about/hero-premium.png"
                  alt="Abstract Art"
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-700"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Massive Mission Text & Office Photo */}
      <section className="py-24 md:py-32 bg-muted/20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="max-w-4xl mx-auto text-center mb-16 md:mb-24">
            <span className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-6 block">
              {lang === "zh" ? "我们的宣言" : "Our Manifesto"}
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-balance leading-[1.15] text-foreground mb-8">
              {pick(lang, META_UNICORN_THESIS).headline}
            </h2>
            <div className="space-y-6 max-w-3xl mx-auto">
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed text-balance">
                {pick(lang, META_UNICORN_THESIS).thesis}
              </p>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed text-balance">
                {pick(lang, META_UNICORN_THESIS).paradigm}
              </p>
            </div>
          </div>

          <div className="relative w-full aspect-video max-h-[700px] overflow-hidden rounded-[2.5rem] shadow-2xl group">
            <Image
              src="/images/about/office.png"
              alt="Office Collaboration"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
            />
          </div>
        </div>
      </section>

      {/* 2.5 Triple Vision — 创业智能化 / 轻量化 / 民主化 */}
      <section className="py-24 md:py-32 bg-background border-t border-border/50">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <AnimateIn preset="fadeUp" inView>
            <div className="mb-16 md:mb-24 text-center md:text-left max-w-4xl">
              <span className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-6 block">
                {lang === "zh" ? "我们的愿景" : "Our Vision"}
              </span>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-balance leading-[1.1]">
                {lang === "zh"
                  ? "创业,应该智能化、轻量化、民主化"
                  : "Entrepreneurship should be Intelligent, Lightweight, and Democratic"}
              </h2>
            </div>
          </AnimateIn>

          <AnimateInGroup
            stagger="normal"
            className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14 mb-20"
          >
            {TRIPLE_VISION.map((entry, idx) => {
              const content = pick(lang, entry);
              const num = String(idx + 1).padStart(2, "0");
              return (
                <AnimateIn key={content.keyword} preset="fadeUp">
                  <div className="relative flex flex-col border-t border-border pt-8">
                    <span
                      aria-hidden="true"
                      className="text-[6rem] md:text-[7rem] font-black leading-none tracking-tighter text-muted-foreground/15 select-none mb-4"
                    >
                      {num}
                    </span>
                    <h3 className="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-6">
                      {content.keyword}
                    </h3>
                    <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                      {content.statement}
                    </p>
                  </div>
                </AnimateIn>
              );
            })}
          </AnimateInGroup>

          <AnimateIn preset="fadeUp" inView>
            <div className="max-w-3xl">
              <p className="text-xl md:text-2xl font-semibold tracking-tight text-foreground leading-relaxed text-balance">
                {lang === "zh"
                  ? "这不是口号——这是我们对产品、制度与生态的工程化承诺。"
                  : "This isn't a slogan — it's our engineering commitment to product, institution, and ecosystem."}
              </p>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* 2.75 Omni-Factor Routing Protocol — 超级要素路由协议 */}
      <section className="py-24 md:py-32 bg-background border-t border-border/50">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <AnimateIn preset="fadeUp" inView>
            <div className="mb-16 md:mb-20 max-w-4xl">
              <span className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-6 block">
                {lang === "zh"
                  ? "OMNI-FACTOR ROUTING / 超级要素路由"
                  : "OMNI-FACTOR ROUTING / 超级要素路由"}
              </span>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-balance leading-[1.1] mb-8">
                {lang === "zh" ? "让生产要素去到最适合的地方" : "Route Every Factor of Production"}
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed text-balance max-w-3xl">
                {lang === "zh"
                  ? "Nebutra 把商业运转中的中介低效、系统傲慢与标签偏见视为资源错配的根源。我们构建全球数字神经网络,作为生产要素的路由引擎——三类要素,同等精度对待。"
                  : "Nebutra treats intermediary inefficiency, systemic arrogance, and label bias as root causes of resource misallocation. We build a global digital nervous system as the routing engine for factors of production — three categories, all treated with equal precision."}
              </p>
            </div>
          </AnimateIn>

          <AnimateInGroup
            stagger="normal"
            className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 mb-12"
          >
            {OMNI_FACTOR_GROUPS.map((entry) => {
              const content = pick(lang, entry);
              return (
                <AnimateIn key={content.category} preset="fadeUp">
                  <div className="flex flex-col h-full border-t border-border pt-8">
                    <h3 className="text-2xl md:text-3xl font-black tracking-tight text-foreground mb-3">
                      {content.category}
                    </h3>
                    <p className="text-[11px] font-mono tracking-widest uppercase text-muted-foreground mb-6">
                      {content.subtitle}
                    </p>
                    <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                      {content.description}
                    </p>
                  </div>
                </AnimateIn>
              );
            })}
          </AnimateInGroup>

          <AnimateIn preset="fadeUp" inView>
            <p className="text-sm text-muted-foreground">
              {lang === "zh" ? "完整协议见 → " : "Full protocol → "}
              <Link
                href="/about/whitepaper"
                className="font-semibold text-foreground underline underline-offset-4 hover:text-primary transition-colors"
              >
                {lang === "zh" ? "商业白皮书" : "Business Whitepaper"}
              </Link>
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* 3. OpenAI Style Jobs Opportunity Block */}
      <section className="py-20 bg-muted/20 border-y border-border/50">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <div className="inline-flex items-center justify-center mb-8">
            <LogomarkSVG className="h-16 w-16 text-foreground" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-6">{t("jobsTitle")}</h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 text-balance">
            {t("jobsDescription")}
          </p>
          <Button
            size="lg"
            className="rounded-full px-8 font-semibold h-14 bg-foreground text-background hover:bg-foreground/90 hover:scale-105 transition-transform"
          >
            {t("jobsButton")} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* 4. Values Bento Grid (4 Columns) */}
      <section className="py-32 bg-background relative">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <div className="mb-20 text-center md:text-left">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              {t("valuesTitle")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[0, 1, 2, 3].map((i) => {
              const titleRaw = t(`values.${i}.title` as any);
              const parts = titleRaw.split(" (");
              const zhText = parts[0];
              const enText = parts.length > 1 ? parts[1].replace(")", "") : "";

              return (
                <div
                  key={i}
                  className="group relative bg-muted/20 border border-border/50 rounded-3xl overflow-hidden hover:shadow-2xl hover:border-border transition-all duration-500 flex flex-col h-full"
                >
                  {/* Top Image Slab */}
                  <div className="relative aspect-square w-full bg-muted/30 overflow-hidden">
                    <Image
                      src={valueImages[i]}
                      alt={zhText}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  {/* Content Slab */}
                  <div className="p-8 flex-1 flex flex-col justify-start">
                    <h4 className="text-xl font-bold tracking-tight mb-2 text-foreground group-hover:text-primary transition-colors">
                      {zhText}
                    </h4>
                    {enText && (
                      <p className="text-[10px] font-mono tracking-widest uppercase text-primary/60 mb-4">
                        {enText}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                      {t(`values.${i}.description` as any)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Organization & Architecture Philosophy (50/50 Split) */}
      <section className="py-24 md:py-32 overflow-hidden bg-muted/30 border-t border-border/50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
            {/* Left: Text */}
            <div className="flex-1 w-full text-left order-2 lg:order-1">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-8">
                {t("companyInfoTitle")}
              </h2>
              <div className="space-y-6 text-[1.1rem] text-muted-foreground leading-relaxed max-w-xl">
                <p>{t("missionP2")}</p>
                <div className="pt-8 mt-8 border-t border-border/50 grid grid-cols-2 gap-8">
                  <div>
                    <h5 className="text-[11px] font-bold tracking-[0.2em] uppercase text-foreground mb-3">
                      {t("companyInfo.legalName")}
                    </h5>
                    <p className="text-muted-foreground font-mono text-sm">WUXI NEBUTRA</p>
                  </div>
                  <div>
                    <h5 className="text-[11px] font-bold tracking-[0.2em] uppercase text-foreground mb-3">
                      {t("companyInfo.founded")}
                    </h5>
                    <p className="text-muted-foreground font-mono text-sm">EST. 2025</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Right: Landscape Image */}
            <div className="flex-1 w-full order-1 lg:order-2">
              <div className="relative aspect-square md:aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl">
                <Image
                  src="/images/about/landscape.png"
                  alt="Organization Philosophy"
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-1000"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5.5 Explore More — Entry cards to child pages */}
      <section className="py-24 md:py-32 bg-background">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <div className="mb-16 text-center md:text-left">
            <span className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-4 block">
              {lang === "zh" ? "深入了解" : "Explore More"}
            </span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-balance">
              {lang === "zh" ? "走进云毓的不同维度" : "Dimensions of Nebutra"}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                href: "/about/business-portfolio",
                kicker: "01",
                title: lang === "zh" ? "核心能力布局" : "Business Portfolio",
                desc:
                  lang === "zh"
                    ? "19 项核心能力，覆盖模态 / 技术 / 平台 / 治理四个层面"
                    : "19 core capabilities across modality, technology, platform, and governance",
              },
              {
                href: "/about/products",
                kicker: "02",
                title: lang === "zh" ? "旗舰产品" : "Flagship Product",
                desc:
                  lang === "zh"
                    ? "云毓万象 Nebutra Sailor · 三大业务闭环"
                    : "Nebutra Sailor · Three business pillars",
              },
              {
                href: "/about/innovation",
                kicker: "03",
                title: lang === "zh" ? "研发与创新" : "R&D & Innovation",
                desc:
                  lang === "zh"
                    ? "AI 原生架构 · 开源基础设施 · 工程最佳实践"
                    : "AI-native architecture · Open-source infrastructure · Engineering excellence",
              },
              {
                href: "/about/global",
                kicker: "04",
                title: lang === "zh" ? "全球化布局" : "Global Presence",
                desc:
                  lang === "zh"
                    ? "Day 1 出海 · 多语种合规 · 全球 Edge"
                    : "Day-1 Global · Multi-lingual compliance · Global Edge",
              },
              {
                href: "/about/whitepaper",
                kicker: "05",
                title: lang === "zh" ? "白皮书" : "Business Whitepaper",
                desc:
                  lang === "zh"
                    ? "Nebutra 生态基建宣言 · 元独角兽战略定位 · 组织演进准则"
                    : "Nebutra ecosystem manifesto · Meta-Unicorn thesis · Organizational principles",
              },
            ].map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group relative flex flex-col justify-between bg-muted/20 hover:bg-muted/40 border border-border/50 hover:border-border rounded-3xl p-10 md:p-12 transition-all duration-500 min-h-[260px]"
              >
                <div>
                  <span className="text-[11px] font-mono tracking-widest uppercase text-primary/60 mb-6 block">
                    {card.kicker}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-4 text-foreground group-hover:text-primary transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-base text-muted-foreground leading-relaxed">{card.desc}</p>
                </div>
                <div className="flex items-center gap-2 mt-8 text-sm font-semibold text-foreground group-hover:translate-x-1 transition-transform">
                  {lang === "zh" ? "深入了解" : "Explore"}
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Massive Footer Join Us CTA */}
      <section className="py-32 md:py-48 bg-muted/20">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-sm font-bold tracking-widest uppercase text-primary">
              {lang === "zh" ? "加入我们的愿景" : "Join Our Vision"}
            </span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-balance mb-12">
            {lang === "zh"
              ? "加入我们，共创科技未来"
              : "Join us to co-create the technological future"}
          </h2>
          <Link href="/contact">
            <Button
              size="lg"
              className="rounded-full h-16 w-56 text-lg font-bold shadow-xl border-border bg-foreground text-background hover:scale-105 transition-transform"
            >
              {t("ctaButton")}
            </Button>
          </Link>
        </div>
      </section>

      <FooterMinimal />
    </main>
  );
}
