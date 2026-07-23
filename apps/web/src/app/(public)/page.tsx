import { brand } from "@nebutra/brand/metadata";
import { toContentLocale, toOpenGraphLocale } from "@nebutra/i18n/locales";
import type { Icon as DashboardIcon } from "@nebutra/icons";
import { ArrowRight, CheckCircle, CreditCard, Message, Users } from "@nebutra/icons";
import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { BrandLogo, webBrandLabels } from "@/components/brand/brand-assets";

type Locale = "en" | "zh";

interface PublicDashboardCopy {
  badge: string;
  title: string;
  subtitle: string;
  primaryAction: string;
  secondaryAction: string;
  workspaceAction: string;
  nav: Array<{ href: string; label: string }>;
  metrics: Array<{ label: string; value: string; detail: string; icon: DashboardIcon }>;
  serviceTitle: string;
  serviceBody: string;
  gated: Array<string>;
  seoTitle: string;
  seoDescription: string;
}

const COPY: Record<Locale, PublicDashboardCopy> = {
  en: {
    badge: "Live demo",
    title: `See ${brand.name} in action — no sign-in required.`,
    subtitle:
      "Walk through a working console with sample data. Sign in when you're ready to bring your own team and connect real services.",
    primaryAction: "Open workspace",
    secondaryAction: "Watch the demo",
    workspaceAction: "Open workspace",
    nav: [
      { href: "/#signals", label: "Overview" },
      { href: "/demo/embed", label: "Demo" },
      { href: "/sign-in", label: "Sign in" },
    ],
    metrics: [
      {
        label: "Multi-tenant",
        value: "One team, one space",
        detail: "Orgs, roles, audit, and usage are isolated per tenant by default.",
        icon: Users,
      },
      {
        label: "AI built in",
        value: "Chat, agents, tools",
        detail: "Streaming chat, tool-calling, and agent orchestration on the Vercel AI SDK.",
        icon: Message,
      },
      {
        label: "Billing",
        value: "End-to-end",
        detail: "Subscriptions, seats, and usage metering wired up — no glue code required.",
        icon: CreditCard,
      },
    ],
    serviceTitle: "What you unlock after signing in",
    serviceBody:
      "Public pages are for browsing. Once you sign in, everything below is yours to use.",
    gated: [
      "Live AI chat",
      "Workspace analytics",
      "Subscriptions & seats",
      "API keys",
      "Audit log",
    ],
    seoTitle: `${brand.name} — live demo`,
    seoDescription: `Explore ${brand.name}'s AI-native SaaS console with sample data. Sign in to bring your own team, connect real services, and unlock chat, billing, and analytics.`,
  },
  zh: {
    badge: "实时演示",
    title: `登录前先逛逛 ${brand.name} 控制台。`,
    subtitle: "用示例数据走通整套流程；准备好接入自己的团队和数据时，再登录创建工作区。",
    primaryAction: "进入工作区",
    secondaryAction: "观看演示",
    workspaceAction: "进入工作区",
    nav: [
      { href: "/#signals", label: "概览" },
      { href: "/demo/embed", label: "演示" },
      { href: "/sign-in", label: "登录" },
    ],
    metrics: [
      {
        label: "多租户",
        value: "一团队 · 一空间",
        detail: "组织、角色、审计、用量按租户自动隔离，不会互相串台。",
        icon: Users,
      },
      {
        label: "原生 AI",
        value: "聊天 · Agent · 工具",
        detail: "基于 Vercel AI SDK，流式对话、工具调用、Agent 编排全部就位。",
        icon: Message,
      },
      {
        label: "计费",
        value: "端到端打通",
        detail: "订阅、席位、用量计费一次配好，不用自己拼胶水代码。",
        icon: CreditCard,
      },
    ],
    serviceTitle: "登录后才解锁",
    serviceBody: "公开页面用来浏览；登录之后，下面这些就都归你用了。",
    gated: ["实时 AI 聊天", "工作区分析", "订阅与席位", "API Key", "审计日志"],
    seoTitle: `${brand.name} · 在线演示`,
    seoDescription: `用示例数据浏览 ${brand.name} 的 AI 原生 SaaS 控制台；登录后可接入自己的团队和数据，使用聊天、计费、分析等完整服务。`,
  },
};

// COPY map covers en/zh only; all other locales fall back to en.
function resolveLocale(locale: string): Locale {
  return toContentLocale(locale);
}

// Cookie-based i18n: no locale prefix in URLs — return href unchanged.
function localizedHref(href: string) {
  return href;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const currentLocale = resolveLocale(locale);
  const copy = COPY[currentLocale];

  return {
    title: copy.seoTitle,
    description: copy.seoDescription,
    robots: {
      index: true,
      follow: true,
    },
    // Cookie-based i18n: one canonical URL, no per-locale language alternates.
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: copy.seoTitle,
      description: copy.seoDescription,
      type: "website",
      locale: toOpenGraphLocale(currentLocale),
    },
  };
}

export default async function PublicDashboardPage() {
  const locale = await getLocale();
  const currentLocale = resolveLocale(locale);
  const copy = COPY[currentLocale];

  return (
    <main id="main-content" className="min-h-screen bg-neutral-1 text-neutral-12">
      <header className="border-neutral-5 border-b bg-neutral-1/95 text-neutral-12 shadow-[0_1px_0_rgba(24,24,27,0.04)] supports-[backdrop-filter]:bg-neutral-1/88 supports-[backdrop-filter]:backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href={localizedHref("/")}
            aria-label={webBrandLabels.homeLink}
            className="inline-flex min-w-0 items-center rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <BrandLogo variant="horizontal" colorScheme="light" className="h-6 w-[8.5rem]" />
          </Link>
          <nav className="hidden items-center gap-1 text-sm text-neutral-11 md:flex">
            {copy.nav.map((item) => (
              <Link
                key={item.href}
                href={localizedHref(item.href)}
                className="rounded-[var(--radius-md)] px-2.5 py-1.5 transition-colors hover:bg-neutral-2 hover:text-neutral-12"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href={localizedHref("/workspace")}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-neutral-12 px-3 py-1.5 text-sm font-medium text-neutral-1 transition-colors hover:bg-neutral-11"
          >
            {copy.workspaceAction}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-[1280px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-10">
        <div className="flex min-w-0 flex-col justify-between gap-6 rounded-[var(--radius-lg)] border border-neutral-6 bg-neutral-2 p-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-neutral-1 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-blue-11 dark:text-blue-8">
              <span className="size-1.5 rounded-full bg-green-9" aria-hidden="true" />
              {copy.badge}
            </div>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-balance text-neutral-12 sm:text-4xl">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-11">{copy.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={localizedHref("/workspace")}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-primary px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              {copy.primaryAction}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
            <Link
              href={localizedHref("/demo/embed")}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-neutral-7 px-3.5 py-2 text-sm font-medium text-neutral-11 transition-colors hover:bg-neutral-1 hover:text-neutral-12"
            >
              {copy.secondaryAction}
            </Link>
          </div>
        </div>

        <div id="signals" className="grid gap-3">
          {copy.metrics.map(({ label, value, detail, icon: Icon }) => (
            <article
              key={label}
              className="rounded-[var(--radius-lg)] border border-neutral-6 bg-neutral-1 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-neutral-10">{label}</p>
                <Icon className="size-4 text-neutral-9" aria-hidden="true" />
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-12">{value}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-10">{detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1280px] px-4 pb-10 sm:px-6">
        <div className="grid gap-4 rounded-[var(--radius-lg)] border border-neutral-6 bg-neutral-2 p-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-neutral-12">
              {copy.serviceTitle}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-10">{copy.serviceBody}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {copy.gated.map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 rounded-[var(--radius-md)] bg-neutral-1 px-3 py-2 text-sm font-medium text-neutral-11 ring-1 ring-neutral-5"
              >
                <CheckCircle
                  className="size-4 text-green-10 dark:text-green-8"
                  aria-hidden="true"
                />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
