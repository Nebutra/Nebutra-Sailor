import { ArrowRight } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import { setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { AnimateIn, AnimateInGroup } from "@/components/landing/AnimateIn";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { GLOBAL_POINTS, pick } from "../_about-data";

// ─── Page-local content (bilingual) ──────────────────────────────────────────

const EYEBROW = { zh: "全球化布局", en: "Global Presence" } as const;

const HERO_TITLE = { zh: "生而全球化", en: "Day 1 Global" } as const;

const HERO_SUB = {
  zh: "Nebutra Sailor 从第一行代码起就是国际化原生架构，而不是后期补丁。对标 Stripe、Vercel、Linear 等全球化基因产品，我们为您铺好从 Day 1 走向全球市场的基础设施底座。",
  en: "Nebutra Sailor has been internationally-native since line one — not an afterthought patch. Benchmarked against globally-born products like Stripe, Vercel, and Linear, we lay the infrastructure groundwork for you to ship to global markets from day one.",
} as const;

const PILLARS_TITLE = { zh: "全球化四大支柱", en: "Four Pillars of Global Readiness" } as const;
const PILLARS_SUB = {
  zh: "语种、合规、支付、边缘网络 — 构成出海业务的四个基础维度。",
  en: "Languages, compliance, payments, and edge network — the four foundational dimensions of going global.",
} as const;

// Languages coverage
const LANG_TITLE = { zh: "7 大主干语种", en: "7 Primary Languages" } as const;
const LANG_SUB = {
  zh: "原生国际化（i18n）+ 动态本地化（l10n），覆盖全球约 40 亿人口。",
  en: "Native i18n + dynamic l10n, covering ~4 billion people globally.",
} as const;

const LANGUAGES: ReadonlyArray<{
  code: string;
  flag: string;
  name: { zh: string; en: string };
  region: { zh: string; en: string };
}> = [
  {
    code: "ZH",
    flag: "🇨🇳",
    name: { zh: "简体中文", en: "Simplified Chinese" },
    region: { zh: "中国大陆 · 新加坡", en: "Mainland China · Singapore" },
  },
  {
    code: "EN",
    flag: "🇺🇸",
    name: { zh: "英语", en: "English" },
    region: { zh: "北美 · 英联邦", en: "North America · Commonwealth" },
  },
  {
    code: "JA",
    flag: "🇯🇵",
    name: { zh: "日本語", en: "Japanese" },
    region: { zh: "日本", en: "Japan" },
  },
  {
    code: "KO",
    flag: "🇰🇷",
    name: { zh: "한국어", en: "Korean" },
    region: { zh: "韩国", en: "South Korea" },
  },
  {
    code: "ES",
    flag: "🇪🇸",
    name: { zh: "Español", en: "Spanish" },
    region: { zh: "西班牙 · 拉美", en: "Spain · Latin America" },
  },
  {
    code: "FR",
    flag: "🇫🇷",
    name: { zh: "Français", en: "French" },
    region: { zh: "法国 · 法语区非洲", en: "France · Francophone Africa" },
  },
  {
    code: "DE",
    flag: "🇩🇪",
    name: { zh: "Deutsch", en: "German" },
    region: { zh: "德奥瑞 DACH", en: "DACH Region" },
  },
];

// Compliance matrix
const COMPLIANCE_TITLE = { zh: "合规矩阵", en: "Compliance Matrix" } as const;
const COMPLIANCE_SUB = {
  zh: "主流监管框架 Day 1 支持，企业级认证按 Roadmap 推进。",
  en: "Major regulatory frameworks supported on Day 1; enterprise certifications on the roadmap.",
} as const;

type ComplianceStatus = "day1" | "roadmap";

const COMPLIANCE_ROWS: ReadonlyArray<{
  region: { zh: string; en: string };
  framework: { zh: string; en: string };
  status: ComplianceStatus;
  note: { zh: string; en: string };
}> = [
  {
    region: { zh: "中国大陆", en: "Mainland China" },
    framework: { zh: "个人信息保护法 (PIPL)", en: "PIPL" },
    status: "day1",
    note: { zh: "Day 1 支持", en: "Day 1 Support" },
  },
  {
    region: { zh: "欧盟", en: "European Union" },
    framework: { zh: "GDPR", en: "GDPR" },
    status: "day1",
    note: { zh: "Day 1 支持", en: "Day 1 Support" },
  },
  {
    region: { zh: "美国", en: "United States" },
    framework: { zh: "CCPA / CPRA", en: "CCPA / CPRA" },
    status: "day1",
    note: { zh: "Day 1 支持", en: "Day 1 Support" },
  },
  {
    region: { zh: "数据出境", en: "Cross-border Transfer" },
    framework: { zh: "数据出境安全评估", en: "Data Export Security Assessment" },
    status: "day1",
    note: { zh: "Day 1 支持", en: "Day 1 Support" },
  },
  {
    region: { zh: "企业认证", en: "Enterprise Certification" },
    framework: { zh: "SOC 2 Type I", en: "SOC 2 Type I" },
    status: "roadmap",
    note: { zh: "Roadmap · 2026 Q3", en: "Roadmap · 2026 Q3" },
  },
];

// Payment gateways
const PAYMENTS_TITLE = { zh: "多地区支付", en: "Multi-region Payments" } as const;
const PAYMENTS_SUB = {
  zh: "一次接入，覆盖全球主流收单、订阅与加密渠道。",
  en: "Integrate once; reach all major global acquirers, subscriptions, and crypto rails.",
} as const;

const PAYMENT_GATEWAYS: ReadonlyArray<{
  name: string;
  region: { zh: string; en: string };
}> = [
  { name: "Stripe", region: { zh: "全球", en: "Global" } },
  { name: "LemonSqueezy", region: { zh: "Merchant of Record", en: "Merchant of Record" } },
  { name: "Polar", region: { zh: "开发者友好", en: "Developer-first" } },
  { name: "Alipay", region: { zh: "中国大陆", en: "Mainland China" } },
  { name: "WeChat Pay", region: { zh: "中国大陆", en: "Mainland China" } },
  { name: "Razorpay", region: { zh: "印度 · 东南亚", en: "India · SEA" } },
];

// CTA
const CTA_EYEBROW = { zh: "Ready to Sail", en: "Ready to Sail" } as const;
const CTA_TITLE = { zh: "准备在全球启航？", en: "Ready to set sail globally?" } as const;
const CTA_SUB = {
  zh: "从本地验证到全球扩张，Sailor 是您最可靠的技术合伙人。",
  en: "From local validation to global expansion, Sailor is your most reliable technical co-founder.",
} as const;
const CTA_BUTTON = { zh: "联系我们", en: "Contact Us" } as const;

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  const title = pick(lang, {
    zh: "全球化布局 — 关于我们 · Nebutra Sailor",
    en: "Global Presence — About · Nebutra Sailor",
  });
  const description = pick(lang, {
    zh: "Nebutra Sailor 生而全球化 — 7 大主干语种、跨境数据合规、多地区支付、全球 Edge 网络，Day 1 即可出海。",
    en: "Nebutra Sailor is Day-1 global — 7 primary languages, cross-border compliance, multi-region payments, and a global edge network, ready on day one.",
  });

  return { title, description };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function GlobalPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  return (
    <main id="main-content" className="flex flex-col min-h-screen bg-background">
      <Navbar />

      {/* 1. Hero — Day 1 Global */}
      <section className="pt-32 md:pt-48 pb-24 md:pb-32 overflow-hidden">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <AnimateIn preset="emerge" className="max-w-4xl mx-auto text-center">
            <span className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-8 block">
              {pick(lang, EYEBROW)}
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-balance mb-10">
              {pick(lang, HERO_TITLE)}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed text-balance">
              {pick(lang, HERO_SUB)}
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* 2. Four Pillars of Global Readiness */}
      <section className="py-24 md:py-32 border-t border-border/50">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <AnimateIn preset="fadeUp" className="max-w-3xl mx-auto text-center mb-16 md:mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
              {pick(lang, PILLARS_TITLE)}
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              {pick(lang, PILLARS_SUB)}
            </p>
          </AnimateIn>

          <AnimateInGroup
            stagger="normal"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {GLOBAL_POINTS.map((point, i) => {
              const p = pick(lang, point);
              return (
                <AnimateIn key={`pillar-${i}`} preset="fadeUp">
                  <div className="group h-full bg-muted/20 border border-border/50 rounded-3xl p-8 hover:shadow-2xl hover:border-border transition-all duration-500 flex flex-col">
                    <div className="text-6xl mb-8" aria-hidden="true">
                      {p.icon}
                    </div>
                    <h3 className="text-xl font-bold tracking-tight mb-3 text-foreground group-hover:text-primary transition-colors">
                      {p.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                  </div>
                </AnimateIn>
              );
            })}
          </AnimateInGroup>
        </div>
      </section>

      {/* 3. Language Coverage Matrix */}
      <section className="py-24 md:py-32 bg-muted/30 border-t border-border/50">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <AnimateIn preset="fadeUp" className="max-w-3xl mx-auto text-center mb-16 md:mb-20">
            <span className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-6 block">
              i18n · l10n
            </span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
              {pick(lang, LANG_TITLE)}
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              {pick(lang, LANG_SUB)}
            </p>
          </AnimateIn>

          <AnimateInGroup
            stagger="fast"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {LANGUAGES.map((lng) => (
              <AnimateIn key={lng.code} preset="fadeUp">
                <div className="group h-full bg-background border border-border/50 rounded-2xl p-6 hover:border-border hover:shadow-lg transition-all duration-300 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-4xl" aria-hidden="true">
                      {lng.flag}
                    </span>
                    <span className="text-[11px] font-mono font-bold tracking-widest text-muted-foreground px-2 py-1 rounded-md bg-muted/50 border border-border/50">
                      {lng.code}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold tracking-tight mb-1 text-foreground">
                    {pick(lang, lng.name)}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {pick(lang, lng.region)}
                  </p>
                </div>
              </AnimateIn>
            ))}
          </AnimateInGroup>
        </div>
      </section>

      {/* 4. Compliance Matrix */}
      <section className="py-24 md:py-32 border-t border-border/50">
        <div className="container mx-auto px-4 max-w-6xl">
          <AnimateIn preset="fadeUp" className="max-w-3xl mx-auto text-center mb-16 md:mb-20">
            <span className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-6 block">
              Compliance
            </span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
              {pick(lang, COMPLIANCE_TITLE)}
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              {pick(lang, COMPLIANCE_SUB)}
            </p>
          </AnimateIn>

          <AnimateIn preset="fadeUp">
            <div className="overflow-hidden rounded-3xl border border-border/50 bg-background">
              {/* Header row — hidden on mobile */}
              <div className="hidden md:grid md:grid-cols-[1.2fr_1.5fr_1fr] gap-6 px-8 py-5 bg-muted/40 border-b border-border/50">
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
                  {pick(lang, { zh: "地区", en: "Region" })}
                </span>
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
                  {pick(lang, { zh: "合规框架", en: "Framework" })}
                </span>
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted-foreground text-right">
                  {pick(lang, { zh: "状态", en: "Status" })}
                </span>
              </div>

              {COMPLIANCE_ROWS.map((row, i) => (
                <div
                  key={`compliance-${i}`}
                  className="grid grid-cols-1 md:grid-cols-[1.2fr_1.5fr_1fr] gap-2 md:gap-6 px-6 md:px-8 py-6 border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex flex-col md:block">
                    <span className="md:hidden text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1">
                      {pick(lang, { zh: "地区", en: "Region" })}
                    </span>
                    <span className="text-base font-semibold text-foreground">
                      {pick(lang, row.region)}
                    </span>
                  </div>
                  <div className="flex flex-col md:block">
                    <span className="md:hidden text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1">
                      {pick(lang, { zh: "合规框架", en: "Framework" })}
                    </span>
                    <span className="text-base text-muted-foreground font-mono">
                      {pick(lang, row.framework)}
                    </span>
                  </div>
                  <div className="flex md:justify-end items-center">
                    <span
                      className={
                        row.status === "day1"
                          ? "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-foreground text-background"
                          : "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border"
                      }
                    >
                      <span
                        className={
                          row.status === "day1"
                            ? "w-1.5 h-1.5 rounded-full bg-background"
                            : "w-1.5 h-1.5 rounded-full bg-muted-foreground"
                        }
                        aria-hidden="true"
                      />
                      {pick(lang, row.note)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* 5. Multi-region Payments */}
      <section className="py-24 md:py-32 bg-muted/30 border-t border-border/50">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <AnimateIn preset="fadeUp" className="max-w-3xl mx-auto text-center mb-16 md:mb-20">
            <span className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-6 block">
              Payments
            </span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
              {pick(lang, PAYMENTS_TITLE)}
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              {pick(lang, PAYMENTS_SUB)}
            </p>
          </AnimateIn>

          <AnimateInGroup
            stagger="fast"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {PAYMENT_GATEWAYS.map((gw) => (
              <AnimateIn key={gw.name} preset="fadeUp">
                <div className="group h-full bg-background border border-border/50 rounded-2xl p-6 hover:border-foreground/30 hover:shadow-lg transition-all duration-300 flex flex-col items-center text-center">
                  <span className="text-lg md:text-xl font-black tracking-tight text-foreground mb-2">
                    {gw.name}
                  </span>
                  <span className="text-[11px] font-mono tracking-wider uppercase text-muted-foreground">
                    {pick(lang, gw.region)}
                  </span>
                </div>
              </AnimateIn>
            ))}
          </AnimateInGroup>
        </div>
      </section>

      {/* 6. CTA */}
      <section className="py-32 md:py-48 bg-background border-t border-border/50">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <AnimateIn preset="emerge">
            <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <span className="text-sm font-bold tracking-widest uppercase text-primary">
                {pick(lang, CTA_EYEBROW)}
              </span>
            </div>
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-balance mb-8">
              {pick(lang, CTA_TITLE)}
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed text-balance mb-12 max-w-2xl mx-auto">
              {pick(lang, CTA_SUB)}
            </p>
            <Link href="/contact">
              <Button
                size="lg"
                className="rounded-full h-16 px-10 text-lg font-bold shadow-xl border-border bg-foreground text-background hover:scale-105 transition-transform"
              >
                {pick(lang, CTA_BUTTON)} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </AnimateIn>
        </div>
      </section>

      <FooterMinimal />
    </main>
  );
}
