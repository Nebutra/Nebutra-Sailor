import {
  ArrowRight,
  CheckCircle,
  Code,
  FileDependency,
  GitBranch,
  Layers,
  ShieldCheck,
} from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { FooterMinimal, Navbar } from "@/components/landing";
import {
  getFeatureSummary,
  getFeatureTitle,
  getPackageFeatureEntry,
  PACKAGE_FEATURE_ENTRIES,
} from "@/components/landing/features/package-feature-data";
import { type Locale, routing } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";

type FeatureDetailPageProps = {
  params: Promise<{ lang: string; name: string }>;
};

const localeForCopy = (lang: string): "en" | "zh" => (lang === "zh" ? "zh" : "en");

const COPY = {
  back: { en: "Back to features", zh: "返回特性" },
  badge: { en: "Capability artifact", zh: "能力工艺页" },
  boundary: { en: "Boundary", zh: "边界" },
  contracts: { en: "Contracts", zh: "契约" },
  entrypoint: { en: "Entrypoint", zh: "入口" },
  interface: { en: "Interface", zh: "接口" },
  openDocs: { en: "Open feature map", zh: "打开能力地图" },
  owner: { en: "Owner", zh: "Owner" },
  packages: { en: "packages", zh: "包" },
  proof: { en: "Proof", zh: "验证" },
  surface: { en: "Surface", zh: "能力面" },
} as const;

function t(key: keyof typeof COPY, locale: "en" | "zh") {
  return COPY[key][locale];
}

export function generateStaticParams() {
  return routing.locales.flatMap((lang) =>
    PACKAGE_FEATURE_ENTRIES.map((entry) => ({ lang, name: entry.slug })),
  );
}

export async function generateMetadata({ params }: FeatureDetailPageProps): Promise<Metadata> {
  const { lang, name } = await params;
  if (!hasLocale(routing.locales, lang)) return {};

  const entry = getPackageFeatureEntry(name);
  if (!entry) return {};

  const locale = localeForCopy(lang);
  return buildPageMetadata({
    title: `${getFeatureTitle(entry, locale)} | Nebutra`,
    description: getFeatureSummary(entry, locale),
    path: `/features/${entry.slug}`,
    locale: lang as Locale,
  });
}

export default async function FeatureDetailPage({ params }: FeatureDetailPageProps) {
  const { lang, name } = await params;
  if (!hasLocale(routing.locales, lang)) notFound();

  const entry = getPackageFeatureEntry(name);
  if (!entry) notFound();

  const locale = localeForCopy(lang);
  const title = getFeatureTitle(entry, locale);
  const summary = getFeatureSummary(entry, locale);
  const childPreview = entry.children.slice(0, 8);
  const hasChildren = childPreview.length > 0;
  const owner = entry.kind === "package" ? entry.group : entry.slug;

  setRequestLocale(lang as Locale);

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-background text-foreground"
      id="main-content"
    >
      <Navbar />

      <section className="relative mx-auto max-w-[1400px] px-4 pt-32 pb-20 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(circle_at_50%_0%,rgba(73,121,255,0.24),transparent_58%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff14_1px,transparent_1px)] opacity-10 [background-size:24px_24px]" />

        <AnimateIn preset="fadeUp" inView>
          <Link
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 font-semibold text-muted-foreground text-sm backdrop-blur-md transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            href={`/${lang}/features`}
          >
            <ArrowRight className="size-3.5 rotate-180" aria-hidden="true" />
            {t("back", locale)}
          </Link>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,0.72fr)] lg:items-center">
            <div className="relative z-10">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 font-semibold text-primary text-xs uppercase tracking-[0.2em]">
                {t("badge", locale)}
              </div>
              <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.02em] text-foreground sm:text-6xl lg:text-7xl">
                {title}
              </h1>
              <p className="mt-8 max-w-2xl text-lg text-muted-foreground leading-relaxed sm:text-xl">
                {summary}
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 font-semibold text-background text-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  href={`/${lang}/features#capability-${entry.group}`}
                >
                  {t("openDocs", locale)}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <span
                  className="inline-flex items-center rounded-full border border-border/60 bg-background/55 px-5 py-3 font-mono text-muted-foreground text-sm backdrop-blur-md"
                  translate="no"
                >
                  {entry.path}
                </span>
              </div>
            </div>

            <ArtifactVisual
              childPreview={childPreview}
              entryIcon={entry.icon}
              label={entry.label}
              locale={locale}
              owner={owner}
              path={entry.path}
            />
          </div>
        </AnimateIn>
      </section>

      <section className="relative z-10 mx-auto max-w-[1400px] px-4 pb-24 sm:px-6 lg:px-8">
        <AnimateInGroup stagger="fast" className="grid gap-6 lg:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: t("owner", locale),
              body:
                locale === "zh"
                  ? `${owner} 拥有这个能力边界，其他应用只组合它暴露的接口。`
                  : `${owner} owns this capability boundary. Product surfaces compose it through stable interfaces.`,
            },
            {
              icon: FileDependency,
              title: t("boundary", locale),
              body:
                locale === "zh"
                  ? `源码边界固定在 ${entry.path}，避免职责漂移到页面或临时 helper。`
                  : `The source boundary stays at ${entry.path}, keeping implementation detail out of app-local helpers.`,
            },
            {
              icon: CheckCircle,
              title: t("proof", locale),
              body:
                locale === "zh"
                  ? "页面只呈现真实目录结构派生出的能力，不把还不存在的产品承诺写成事实。"
                  : "This page is generated from the real workspace tree, so it presents owned structure rather than invented promises.",
            },
          ].map((card) => {
            const Icon = card.icon;

            return (
              <article
                className="rounded-[var(--radius-panel)] border border-[var(--neutral-6)] bg-background p-7"
                key={card.title}
                style={{ boxShadow: "var(--ring-hairline)" }}
              >
                <Icon className="mb-8 size-5 text-primary" aria-hidden="true" />
                <h2 className="font-semibold text-2xl text-foreground">{card.title}</h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">{card.body}</p>
              </article>
            );
          })}
        </AnimateInGroup>

        {hasChildren ? (
          <div
            className="mt-6 rounded-[var(--radius-panel)] border border-[var(--neutral-6)] bg-background p-7"
            style={{ boxShadow: "var(--ring-hairline)" }}
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="font-semibold text-2xl text-foreground">{t("contracts", locale)}</h2>
              <span className="rounded-full border border-border/60 px-3 py-1 font-mono text-muted-foreground text-xs">
                {entry.children.length} {t("packages", locale)}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {childPreview.map((child) => (
                <Link
                  className="rounded-[var(--radius-sm)] border border-border/60 bg-background/70 px-4 py-3 font-mono text-foreground/85 text-sm transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  href={`/${lang}/features/${child}`}
                  key={child}
                >
                  {child}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <FooterMinimal />
    </main>
  );
}

function ArtifactVisual({
  childPreview,
  entryIcon,
  label,
  locale,
  owner,
  path,
}: {
  childPreview: string[];
  entryIcon?: ReactNode;
  label: string;
  locale: "en" | "zh";
  owner: string;
  path: string;
}) {
  const nodes = childPreview.length
    ? childPreview.slice(0, 5)
    : [label, owner, "interface", "runtime", "proof"];

  return (
    <div
      className="relative min-h-[520px] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--neutral-6)] bg-background"
      style={{ boxShadow: "var(--ring-hairline)" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(77,116,255,0.28),transparent_54%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff18_1px,transparent_1px)] opacity-10 [background-size:24px_24px]" />

      <div className="relative z-10 flex items-center justify-between border-border/60 border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-[#ff5f56]" />
          <span className="size-3 rounded-full bg-[#ffbd2e]" />
          <span className="size-3 rounded-full bg-[#27c93f]" />
        </div>
        <span className="font-mono text-muted-foreground text-xs" translate="no">
          {path}
        </span>
      </div>

      <div className="relative z-10 flex min-h-[456px] items-center justify-center p-8">
        <div className="absolute left-1/2 top-1/2 size-[25rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
        <div className="absolute left-1/2 top-1/2 size-[17rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/25" />

        <div className="relative z-20 flex h-40 w-64 items-center justify-center rounded-[2rem] border border-primary/35 bg-background/78 text-center shadow-[0_0_90px_rgba(83,119,255,0.26)] backdrop-blur-xl">
          <div>
            <span className="mx-auto mb-4 flex size-11 items-center justify-center rounded-[var(--radius-sm)] border border-border/60 bg-background/70 text-primary">
              {entryIcon ?? <Code className="size-5" aria-hidden="true" />}
            </span>
            <p className="font-mono text-foreground text-sm" translate="no">
              {label}
            </p>
            <p className="mt-2 text-muted-foreground text-xs">{t("surface", locale)}</p>
          </div>
        </div>

        {nodes.map((node, index) => {
          const positions = [
            "left-[8%] top-[27%]",
            "right-[8%] top-[24%]",
            "left-[11%] bottom-[23%]",
            "right-[10%] bottom-[24%]",
            "left-1/2 top-[9%] -translate-x-1/2",
          ];
          const icons = [Layers, GitBranch, FileDependency, ShieldCheck, Code];
          const Icon = icons[index] ?? Code;

          return (
            <div
              className={`absolute ${positions[index]} max-w-[12rem] rounded-full border border-white/10 bg-background/64 px-3 py-2 font-mono text-foreground/75 text-xs shadow-sm backdrop-blur-md`}
              key={node}
              translate="no"
            >
              <span className="inline-flex items-center gap-2">
                <Icon className="size-3.5 text-primary" aria-hidden="true" />
                <span className="truncate">{node}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
