import { ArrowRight, ArrowUpRight } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Badge, CodeBlock, MagicCard } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import type { Locale } from "@/i18n/routing";
import { CAPABILITY_FOLDERS, type CapabilityFolder } from "./capability-folder-data";
import { getCodeSampleForGroup } from "./feature-code-samples";

const SECTION_COPY = {
  eyebrow: { en: "High Cohesion · Low Coupling", zh: "高内聚 · 低耦合" },
  title: {
    en: "Capability boundaries as composable systems.",
    zh: "把能力边界做成可组合系统。",
  },
  description: {
    en: "Each card is a real folder: one owner, one interface, one boundary — with the code you'd actually write against it.",
    zh: "每张卡都是一个真实目录：一个 owner、一个接口、一个清晰边界，配上你真正会写的代码。",
  },
  docs: { en: "Open docs", zh: "打开文档" },
  detail: { en: "View artifact", zh: "查看能力" },
  packages: { en: "packages", zh: "包" },
  tests: { en: "tests", zh: "测试" },
} as const;

// Aurora gradient palette per capability group — mirrors the detail page.
const GROUP_AURORA: Record<string, string[]> = {
  ai: ["#9333ea", "#3b82f6", "#22d3ee"],
  iam: ["#ef4444", "#f97316", "#fb7185"],
  integrations: ["#06b6d4", "#3b82f6", "#0ea5e9"],
  platform: ["#3b82f6", "#6366f1", "#8b5cf6"],
  design: ["#0BF1C3", "#0033FE", "#06b6d4"],
  commerce: ["#10b981", "#06b6d4", "#34d399"],
  gateway: ["#10b981", "#3b82f6", "#22d3ee"],
  ops: ["#f59e0b", "#10b981", "#84cc16"],
};

const DEFAULT_AURORA = GROUP_AURORA.platform;

type LocaleKey = "en" | "zh";
const toLocaleKey = (locale: Locale): LocaleKey => (locale === "zh" ? "zh" : "en");

function copyFor(label: { en: string; zh: string }, locale: Locale) {
  return locale === "zh" ? label.zh : label.en;
}

function previewCode(code: string, maxLines = 14): string {
  const lines = code.split("\n");
  if (lines.length <= maxLines) return code;
  return `${lines.slice(0, maxLines).join("\n")}\n…`;
}

function CapabilityCard({ folder, locale }: { folder: CapabilityFolder; locale: Locale }) {
  const localeKey = toLocaleKey(locale);
  const Icon = folder.icon;
  const aurora = GROUP_AURORA[folder.id] ?? DEFAULT_AURORA;
  const sample = getCodeSampleForGroup(folder.id);
  const code = previewCode(sample.code, 16);
  const featureHref = `/${locale}/features/${folder.id}`;

  return (
    <article className="group/card relative flex flex-col scroll-mt-28" id={folder.anchorId}>
      <MagicCard
        className="flex h-full flex-col overflow-hidden rounded-[var(--radius-panel)]"
        gradientSize={300}
        gradientFrom={aurora[0]}
        gradientTo={aurora[2] ?? aurora[1]}
        gradientOpacity={0.5}
      >
        {/* Header — icon + source path + metric chips */}
        <header className="flex items-center justify-between gap-3 border-b border-border/40 px-6 py-4 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              aria-label={`${copyFor(folder.title, locale)} feature page`}
              href={featureHref}
              className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-background/60 transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <Icon className="size-4" />
            </Link>
            <span className="truncate font-mono text-foreground/80 text-sm" translate="no">
              {folder.sourcePath}
            </span>
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <Badge variant="outline" size="sm" className="font-mono tabular-nums">
              {folder.sourceStats.unitCount} {copyFor(folder.sourceStats.unitLabel, locale)}
            </Badge>
            <Badge variant="secondary" size="sm" className="font-mono tabular-nums">
              {folder.sourceStats.testFiles} {SECTION_COPY.tests[localeKey]}
            </Badge>
          </div>
        </header>

        {/* Title + summary */}
        <div className="flex flex-col gap-3 px-6 pt-7 pb-5 sm:px-7">
          <h3 className="font-semibold text-2xl text-foreground leading-tight sm:text-3xl">
            {copyFor(folder.title, locale)}
          </h3>
          <p className="max-w-2xl text-base text-muted-foreground leading-relaxed">
            {copyFor(folder.summary, locale)}
          </p>
        </div>

        {/* Code preview */}
        <div className="px-6 pb-5 sm:px-7">
          <CodeBlock
            filename={sample.filename}
            language={sample.language}
            highlightedLines={sample.highlightedLines}
            hideLineNumbers
            maxHeight="320px"
            aria-label={`${copyFor(folder.title, locale)} usage example`}
          >
            {code}
          </CodeBlock>
        </div>

        {/* Footer — CTA + detail link */}
        <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border/40 px-6 py-4 sm:px-7">
          <a
            aria-label={`${SECTION_COPY.docs[localeKey]}: ${copyFor(folder.title, locale)}`}
            className="group/docs inline-flex items-center gap-2 font-semibold text-foreground text-sm transition-colors hover:text-muted-foreground"
            href={folder.docsHref}
            rel="noreferrer"
            target="_blank"
          >
            {SECTION_COPY.docs[localeKey]}
            <ArrowUpRight
              aria-hidden="true"
              className="size-3.5 transition-transform group-hover/docs:translate-x-0.5 group-hover/docs:-translate-y-0.5"
            />
          </a>
          <Link
            className="group/feat inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em] transition-colors hover:text-foreground"
            href={featureHref}
          >
            {SECTION_COPY.detail[localeKey]}
            <ArrowRight
              aria-hidden="true"
              className="size-3 transition-transform group-hover/feat:translate-x-0.5"
            />
          </Link>
        </footer>
      </MagicCard>
    </article>
  );
}

export function CapabilityFolderShowcase({ locale }: { locale: Locale }) {
  const localeKey = toLocaleKey(locale);
  return (
    <section
      className="relative z-10 mx-auto max-w-[1400px] px-4 pb-20 sm:px-6 lg:px-8"
      id="capability-map"
    >
      <AnimateIn preset="fadeUp" inView>
        <div className="mb-10 max-w-3xl">
          <p className="mb-3 font-bold text-primary text-xs uppercase tracking-[0.2em]">
            {SECTION_COPY.eyebrow[localeKey]}
          </p>
          <h2 className="text-pretty font-semibold text-3xl text-foreground sm:text-4xl">
            {SECTION_COPY.title[localeKey]}
          </h2>
          <p className="mt-4 max-w-2xl font-medium text-base text-muted-foreground leading-relaxed">
            {SECTION_COPY.description[localeKey]}
          </p>
        </div>
      </AnimateIn>

      <AnimateInGroup stagger="fast" className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {CAPABILITY_FOLDERS.map((folder) => (
          <div
            key={folder.id}
            className={cn(
              folder.layout === "wide" && "lg:col-span-7",
              folder.layout === "standard" && "lg:col-span-5",
              folder.layout === "full" && "lg:col-span-12",
            )}
          >
            <CapabilityCard folder={folder} locale={locale} />
          </div>
        ))}
      </AnimateInGroup>
    </section>
  );
}
