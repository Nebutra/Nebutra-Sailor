import type { Icon as NebutraIcon } from "@nebutra/icons";
import {
  ArrowRight,
  ChartActivity,
  CheckCircle,
  CreditCard,
  Lightning,
  Message,
  Shield,
  Users,
} from "@nebutra/icons";
import type { Metadata } from "next";
import Link from "next/link";
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
  metrics: Array<{ label: string; value: string; detail: string; icon: NebutraIcon }>;
  briefs: Array<{ title: string; body: string; icon: NebutraIcon; tone: string }>;
  serviceTitle: string;
  serviceBody: string;
  gated: Array<string>;
  seoTitle: string;
  seoDescription: string;
}

const COPY: Record<Locale, PublicDashboardCopy> = {
  en: {
    badge: "Public intelligence console",
    title: "Nebutra dashboard is readable before login.",
    subtitle:
      "Browse the platform map, sample operating signals, and public AI workflow briefs. Sign in when you need private workspaces, live data, and service execution.",
    primaryAction: "Open workspace",
    secondaryAction: "View demo",
    workspaceAction: "Sign in to use services",
    nav: [
      { href: "/#signals", label: "Signals" },
      { href: "/#workflows", label: "Workflows" },
      { href: "/demo/embed", label: "Demo" },
      { href: "/sign-in", label: "Log in" },
    ],
    metrics: [
      {
        label: "Workspace model",
        value: "Tenant-first",
        detail: "Organizations, roles, audit, and usage stay behind account access.",
        icon: Users,
      },
      {
        label: "AI services",
        value: "Previewable",
        detail: "Public briefs explain the flow; execution requires a signed-in session.",
        icon: Message,
      },
      {
        label: "Governance",
        value: "Indexed",
        detail: "Public pages are crawlable; private app routes stay noindex.",
        icon: Shield,
      },
      {
        label: "Commercial flow",
        value: "Gated",
        detail: "Billing, seats, and plan controls remain private service surfaces.",
        icon: CreditCard,
      },
    ],
    briefs: [
      {
        title: "Ask without entering a workspace",
        body: "Read public summaries and example workflows first; create private sessions after login.",
        icon: Message,
        tone: "text-blue-11 dark:text-blue-9",
      },
      {
        title: "Compare operating signals",
        body: "Use sample analytics to understand the product model without exposing tenant data.",
        icon: ChartActivity,
        tone: "text-cyan-11 dark:text-cyan-9",
      },
      {
        title: "Activate service execution",
        body: "Authenticated users get live chat, API keys, billing, notifications, and admin controls.",
        icon: Lightning,
        tone: "text-green-11 dark:text-green-9",
      },
    ],
    serviceTitle: "Private services start after authentication",
    serviceBody:
      "The public dashboard is for discovery and search. Account-bound work stays inside the protected app shell.",
    gated: ["Live AI chat", "Workspace analytics", "Billing and seats", "API keys", "Audit logs"],
    seoTitle: "Nebutra public dashboard",
    seoDescription:
      "Explore Nebutra's AI-native SaaS dashboard before login. Sign in to use private workspaces, live AI services, analytics, billing, and administration.",
  },
  zh: {
    badge: "公开智能控制台",
    title: "Nebutra dashboard 未登录也能阅读。",
    subtitle:
      "先浏览平台地图、示例运营信号和公开 AI 工作流摘要；需要私有工作区、实时数据和服务执行时再登录。",
    primaryAction: "进入工作区",
    secondaryAction: "查看演示",
    workspaceAction: "登录后使用服务",
    nav: [
      { href: "/#signals", label: "信号" },
      { href: "/#workflows", label: "工作流" },
      { href: "/demo/embed", label: "演示" },
      { href: "/sign-in", label: "登录" },
    ],
    metrics: [
      {
        label: "工作区模型",
        value: "租户优先",
        detail: "组织、角色、审计和用量留在账号访问之后。",
        icon: Users,
      },
      {
        label: "AI 服务",
        value: "可预览",
        detail: "公开摘要解释流程；执行需要已登录会话。",
        icon: Message,
      },
      {
        label: "治理边界",
        value: "可索引",
        detail: "公开页面允许抓取；私有 app 路由保持 noindex。",
        icon: Shield,
      },
      {
        label: "商业流程",
        value: "受保护",
        detail: "账单、席位和计划控制仍是私有服务界面。",
        icon: CreditCard,
      },
    ],
    briefs: [
      {
        title: "不进工作区也能先了解",
        body: "先阅读公开摘要和示例流程；登录后再创建私有会话。",
        icon: Message,
        tone: "text-blue-11 dark:text-blue-9",
      },
      {
        title: "比较运营信号",
        body: "通过示例 analytics 理解产品模型，不暴露租户数据。",
        icon: ChartActivity,
        tone: "text-cyan-11 dark:text-cyan-9",
      },
      {
        title: "激活服务执行",
        body: "登录用户可以使用实时聊天、API keys、账单、通知和管理控制。",
        icon: Lightning,
        tone: "text-green-11 dark:text-green-9",
      },
    ],
    serviceTitle: "私有服务从登录后开始",
    serviceBody: "公开 dashboard 用于发现和搜索；账号绑定工作留在受保护的 app shell 内。",
    gated: ["实时 AI 聊天", "工作区 analytics", "账单和席位", "API keys", "审计日志"],
    seoTitle: "Nebutra 公开 dashboard",
    seoDescription:
      "登录前探索 Nebutra 的 AI-native SaaS dashboard；登录后使用私有工作区、实时 AI 服务、analytics、账单和管理能力。",
  },
};

function resolveLocale(locale: string): Locale {
  return locale === "zh" ? "zh" : "en";
}

function localizedHref(locale: Locale, href: string) {
  if (href.startsWith("https://") || href.startsWith("mailto:")) return href;
  if (href === "/") return `/${locale}`;
  return `/${locale}${href}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const currentLocale = resolveLocale(locale);
  const copy = COPY[currentLocale];

  return {
    title: copy.seoTitle,
    description: copy.seoDescription,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `/${currentLocale}`,
      languages: {
        en: "/en",
        zh: "/zh",
      },
    },
    openGraph: {
      title: copy.seoTitle,
      description: copy.seoDescription,
      type: "website",
      locale: currentLocale === "zh" ? "zh_CN" : "en_US",
    },
  };
}

export default async function PublicDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const currentLocale = resolveLocale(locale);
  const copy = COPY[currentLocale];

  return (
    <main id="main-content" className="min-h-screen bg-neutral-1 text-neutral-12">
      <header className="border-neutral-5 border-b bg-neutral-1/90 backdrop-blur dark:bg-neutral-12/90">
        <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href={localizedHref(currentLocale, "/")}
            aria-label={webBrandLabels.homeLink}
            className="inline-flex min-w-0 items-center rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <BrandLogo variant="horizontal" className="h-6 w-[8.5rem]" />
          </Link>
          <nav className="hidden items-center gap-1 text-sm text-neutral-10 md:flex">
            {copy.nav.map((item) => (
              <Link
                key={item.href}
                href={localizedHref(currentLocale, item.href)}
                className="rounded-[var(--radius-md)] px-2.5 py-1.5 transition-colors hover:bg-neutral-2 hover:text-neutral-12"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href={localizedHref(currentLocale, "/workspace")}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-neutral-12 px-3 py-1.5 text-sm font-medium text-neutral-1 transition-colors hover:bg-neutral-11 dark:text-neutral-12"
          >
            {copy.workspaceAction}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-[1280px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-10">
        <div className="flex min-w-0 flex-col justify-between gap-6 rounded-[var(--radius-lg)] border border-neutral-6 bg-neutral-2 p-5/[0.04]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-neutral-1 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-blue-11 dark:text-blue-8">
              <span className="size-1.5 rounded-full bg-green-9" aria-hidden="true" />
              {copy.badge}
            </div>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-neutral-12 sm:text-4xl lg:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-11">{copy.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={localizedHref(currentLocale, "/workspace")}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[image:var(--brand-gradient)] px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              {copy.primaryAction}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
            <Link
              href={localizedHref(currentLocale, "/demo/embed")}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-neutral-7 px-3.5 py-2 text-sm font-medium text-neutral-11 transition-colors hover:bg-neutral-1 hover:text-neutral-12"
            >
              {copy.secondaryAction}
            </Link>
          </div>
        </div>

        <div id="signals" className="grid gap-3 sm:grid-cols-2">
          {copy.metrics.map(({ label, value, detail, icon: Icon }) => (
            <article
              key={label}
              className="min-h-40 rounded-[var(--radius-lg)] border border-neutral-6 bg-neutral-1 p-4/[0.035]"
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

      <section
        id="workflows"
        className="mx-auto grid w-full max-w-[1280px] gap-4 px-4 pb-8 sm:px-6 lg:grid-cols-3"
      >
        {copy.briefs.map(({ title, body, icon: Icon, tone }) => (
          <article
            key={title}
            className="rounded-[var(--radius-lg)] border border-neutral-6 bg-neutral-1 p-4/[0.03]"
          >
            <Icon className={`size-5 ${tone}`} aria-hidden="true" />
            <h2 className="mt-3 text-base font-semibold text-neutral-12">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-10">{body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto w-full max-w-[1280px] px-4 pb-10 sm:px-6">
        <div className="grid gap-4 rounded-[var(--radius-lg)] border border-neutral-6 bg-neutral-2 p-5/[0.04] lg:grid-cols-[0.9fr_1.1fr]">
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
