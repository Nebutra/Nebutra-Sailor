import {
  Api,
  ArrowRight,
  CheckCircle,
  Connection,
  FileDependency,
  GitBranch,
  Layers,
  LockClosed,
} from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { cn } from "@nebutra/ui/utils";
import type { ComponentType } from "react";
import type { Locale } from "@/i18n/routing";
import {
  CAPABILITY_FOLDERS,
  type CapabilityFolder,
  type CapabilityVisualVariant,
} from "./capability-folder-data";

const copyFor = (copy: CapabilityFolder["title"], locale: Locale) =>
  locale === "zh" ? copy.zh : copy.en;

const SECTION_COPY = {
  eyebrow: {
    en: "High Cohesion · Low Coupling",
    zh: "高内聚 · 低耦合",
  },
  title: {
    en: "Cohesive capabilities, loosely coupled boundaries.",
    zh: "高内聚能力，低耦合边界。",
  },
  description: {
    en: "Nebutra’s AI, platform, identity, design system, integrations, commerce, and gateway layers are organized around one owner per capability, with source-backed interfaces and verification evidence between modules.",
    zh: "Nebutra 的 AI、平台、身份、设计系统、集成、商业与网关能力，按“一个能力一个 owner”收束，并用源码级接口与验证证据隔开模块边界。",
  },
  source: {
    en: "Source",
    zh: "源码",
  },
  topology: {
    en: "Topology",
    zh: "拓扑",
  },
  focus: {
    en: "Focus packages",
    zh: "关键包",
  },
  evidence: {
    en: "Evidence",
    zh: "证据",
  },
  contract: {
    en: "Module contract",
    zh: "模块契约",
  },
  owns: {
    en: "Owns",
    zh: "高内聚职责",
  },
  boundaries: {
    en: "Refuses",
    zh: "低耦合边界",
  },
  proof: {
    en: "Proof",
    zh: "验证证据",
  },
  interfaces: {
    en: "Interfaces",
    zh: "接口",
  },
  docs: {
    en: "Open docs",
    zh: "打开文档",
  },
  units: {
    en: "units",
    zh: "单元",
  },
  sourceFiles: {
    en: "source files",
    zh: "源码文件",
  },
  tests: {
    en: "tests",
    zh: "测试",
  },
  docsSurfaces: {
    en: "docs",
    zh: "文档面",
  },
  portfolio: {
    en: "packages + backend",
    zh: "包 + 后端",
  },
} as const;

const TOPOLOGY_ICONS: Record<CapabilityVisualVariant, ComponentType<{ className?: string }>> = {
  bus: Connection,
  ledger: FileDependency,
  orchestra: GitBranch,
  request: Api,
  stack: Layers,
  supply: GitBranch,
  trust: LockClosed,
};

const toneClasses = {
  adapter: "border-border/50 bg-background/40 text-muted-foreground",
  core: "border-primary/30 bg-primary/10 text-foreground",
  policy: "border-border/60 bg-background/50 text-foreground",
  port: "border-border/50 bg-background/40 text-foreground",
} as const;

function localized(section: keyof typeof SECTION_COPY, locale: Locale) {
  return locale === "zh" ? SECTION_COPY[section].zh : SECTION_COPY[section].en;
}

function SourceMetrics({ folder, locale }: { folder: CapabilityFolder; locale: Locale }) {
  const metrics = [
    {
      label: copyFor(folder.sourceStats.unitLabel, locale),
      value: String(folder.sourceStats.unitCount),
    },
    {
      label: localized("sourceFiles", locale),
      value: String(folder.sourceStats.sourceFiles),
    },
    {
      label: localized("tests", locale),
      value: String(folder.sourceStats.testFiles),
    },
    {
      label: localized("docsSurfaces", locale),
      value: String(folder.sourceStats.readmes),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-sm)] border border-border/50 bg-border/50 sm:grid-cols-4">
      {metrics.map((metric) => (
        <div className="bg-background/40 px-3 py-2.5" key={metric.label}>
          <p className="font-mono text-foreground text-sm" translate="no">
            {metric.value}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{metric.label}</p>
        </div>
      ))}
    </div>
  );
}

function NodePill({
  detail,
  label,
  tone = "port",
  locale,
  compact = false,
}: {
  detail: CapabilityFolder["topology"]["nodes"][number]["detail"];
  label: string;
  tone?: NonNullable<CapabilityFolder["topology"]["nodes"][number]["tone"]>;
  locale: Locale;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-[var(--radius-sm)] border px-3 py-2",
        toneClasses[tone],
        compact ? "py-1.5" : "py-2",
      )}
    >
      <p className="truncate font-mono text-[11px]" translate="no">
        {label}
      </p>
      <p className="mt-1 line-clamp-2 text-[11px] leading-snug">{copyFor(detail, locale)}</p>
    </div>
  );
}

function OrchestraVisual({ folder, locale }: { folder: CapabilityFolder; locale: Locale }) {
  const [core, ...nodes] = folder.topology.nodes;
  const left = nodes.slice(0, 2);
  const right = nodes.slice(2);

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(180px,1.15fr)_minmax(0,1fr)] sm:items-center">
      <div className="space-y-2">
        {left.map((node) => (
          <NodePill
            detail={node.detail}
            key={node.label}
            label={node.label}
            locale={locale}
            tone={node.tone}
          />
        ))}
      </div>
      {core ? (
        <div className="relative rounded-[var(--radius-sm)] border border-primary/30 bg-primary/10 p-4 text-center">
          <div className="mx-auto mb-3 flex size-9 items-center justify-center rounded-full border border-primary/30 bg-background/60">
            <GitBranch className="size-4 text-primary" aria-hidden="true" />
          </div>
          <p className="font-mono text-foreground text-xs" translate="no">
            {core.label}
          </p>
          <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
            {copyFor(core.detail, locale)}
          </p>
        </div>
      ) : null}
      <div className="space-y-2">
        {right.map((node) => (
          <NodePill
            detail={node.detail}
            key={node.label}
            label={node.label}
            locale={locale}
            tone={node.tone}
          />
        ))}
      </div>
    </div>
  );
}

function StackVisual({ folder, locale }: { folder: CapabilityFolder; locale: Locale }) {
  return (
    <div className="space-y-2">
      {folder.topology.nodes.map((node, index) => (
        <div
          className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-stretch gap-3"
          key={node.label}
        >
          <div className="flex flex-col items-center">
            <span className="flex size-7 items-center justify-center rounded-full border border-border/50 bg-background/40 font-mono text-[11px] text-muted-foreground">
              {index + 1}
            </span>
            {index < folder.topology.nodes.length - 1 ? (
              <span className="mt-1 h-full min-h-5 w-px bg-border/50" aria-hidden="true" />
            ) : null}
          </div>
          <NodePill detail={node.detail} label={node.label} locale={locale} tone={node.tone} />
        </div>
      ))}
    </div>
  );
}

function SequenceVisual({ folder, locale }: { folder: CapabilityFolder; locale: Locale }) {
  return (
    <div className="grid gap-2 md:grid-cols-5">
      {folder.topology.nodes.map((node, index) => (
        <div className="relative" key={node.label}>
          <NodePill
            compact
            detail={node.detail}
            label={node.label}
            locale={locale}
            tone={node.tone}
          />
          {index < folder.topology.nodes.length - 1 ? (
            <span
              className="absolute top-1/2 right-[-0.6rem] hidden h-px w-3 bg-border/60 md:block"
              aria-hidden="true"
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function BusVisual({ folder, locale }: { folder: CapabilityFolder; locale: Locale }) {
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(140px,0.6fr)_minmax(0,1.4fr)] md:items-stretch">
      <div className="flex items-center justify-center rounded-[var(--radius-sm)] border border-primary/30 bg-primary/10 p-4 text-center">
        <div>
          <Connection className="mx-auto mb-3 size-5 text-primary" aria-hidden="true" />
          <p className="font-mono text-foreground text-xs" translate="no">
            integration ports
          </p>
          <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
            {copyFor(folder.topology.caption, locale)}
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {folder.topology.nodes.map((node) => (
          <NodePill
            detail={node.detail}
            key={node.label}
            label={node.label}
            locale={locale}
            tone={node.tone}
          />
        ))}
      </div>
    </div>
  );
}

function LedgerVisual({ folder, locale }: { folder: CapabilityFolder; locale: Locale }) {
  return (
    <div className="divide-y divide-border/50 border-border/50 border-y">
      {folder.topology.nodes.map((node) => (
        <div
          className="grid gap-2 py-2.5 sm:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)]"
          key={node.label}
        >
          <p className="truncate font-mono text-foreground text-xs" translate="no">
            {node.label}
          </p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {copyFor(node.detail, locale)}
          </p>
        </div>
      ))}
    </div>
  );
}

function TopologyVisual({ folder, locale }: { folder: CapabilityFolder; locale: Locale }) {
  const Icon = TOPOLOGY_ICONS[folder.topology.variant];
  const variant = folder.topology.variant;

  return (
    <div className="mt-5 border-border/50 border-y py-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 font-semibold text-foreground text-sm">
            {copyFor(folder.topology.title, locale)}
          </p>
          <p className="max-w-xl text-muted-foreground text-xs leading-relaxed">
            {copyFor(folder.designIntent, locale)}
          </p>
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border/50 bg-background/40">
          <Icon className="size-4 text-primary" aria-hidden="true" />
        </div>
      </div>

      {variant === "orchestra" ? <OrchestraVisual folder={folder} locale={locale} /> : null}
      {variant === "stack" ? <StackVisual folder={folder} locale={locale} /> : null}
      {variant === "trust" || variant === "supply" || variant === "request" ? (
        <SequenceVisual folder={folder} locale={locale} />
      ) : null}
      {variant === "bus" ? <BusVisual folder={folder} locale={locale} /> : null}
      {variant === "ledger" ? <LedgerVisual folder={folder} locale={locale} /> : null}
    </div>
  );
}

function BoundarySummary({ folder, locale }: { folder: CapabilityFolder; locale: Locale }) {
  const summaries = [
    {
      label: localized("owns", locale),
      text: folder.owns[0],
    },
    {
      label: localized("boundaries", locale),
      text: folder.boundaries[0],
    },
    {
      label: localized("proof", locale),
      text: folder.proof[0],
    },
  ];

  return (
    <div className="mt-5 grid gap-px overflow-hidden rounded-[var(--radius-sm)] border border-border/50 bg-border/50 md:grid-cols-3">
      {summaries.map((summary) => (
        <div className="bg-background/40 p-4" key={summary.label}>
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
            <h4 className="font-semibold text-foreground text-xs">{summary.label}</h4>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {copyFor(summary.text, locale)}
          </p>
        </div>
      ))}
    </div>
  );
}

function ProofMetrics({ folder, locale }: { folder: CapabilityFolder; locale: Locale }) {
  const metrics = [folder.signature, ...folder.evidence.slice(0, 2)];

  return (
    <div className="grid gap-px overflow-hidden rounded-[var(--radius-sm)] border border-border/50 bg-border/50 sm:grid-cols-3">
      {metrics.map((metric) => (
        <div className="bg-background/40 px-3 py-2.5" key={metric.label.en}>
          <p className="font-mono text-foreground text-sm" translate="no">
            {metric.value}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {copyFor(metric.label, locale)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function CapabilityFolderShowcase({ locale }: { locale: Locale }) {
  return (
    <section
      className="relative z-10 mx-auto max-w-[1400px] px-4 pb-20 sm:px-6 lg:px-8"
      id="capability-map"
    >
      <AnimateIn preset="fadeUp" inView>
        <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(260px,0.25fr)] lg:items-end">
          <div className="max-w-3xl">
            <p className="mb-3 font-bold text-primary text-xs uppercase tracking-[0.2em]">
              {localized("eyebrow", locale)}
            </p>
            <h2
              className="text-3xl font-semibold text-foreground text-pretty sm:text-4xl"
              style={{ letterSpacing: "var(--tracking-heading)" }}
            >
              {localized("title", locale)}
            </h2>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground leading-relaxed">
              {localized("description", locale)}
            </p>
          </div>
          <div
            className="rounded-[var(--radius-panel)] border border-border/50 bg-background/40 p-4 backdrop-blur-md"
            style={{ boxShadow: "var(--ring-hairline)" }}
          >
            <p className="font-mono text-foreground text-sm" translate="no">
              {localized("portfolio", locale)}
            </p>
            <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
              {CAPABILITY_FOLDERS.length} {localized("units", locale)} ·{" "}
              {CAPABILITY_FOLDERS.reduce((sum, item) => sum + item.sourceStats.testFiles, 0)}{" "}
              {localized("tests", locale)}
            </p>
          </div>
        </div>
      </AnimateIn>

      <AnimateInGroup stagger="fast" className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {CAPABILITY_FOLDERS.map((folder) => {
          const Icon = folder.icon;

          return (
            <article
              className={cn(
                "group relative overflow-hidden scroll-mt-28 rounded-[var(--radius-panel)] border border-[var(--neutral-6)] bg-background/40 p-5 backdrop-blur-md transition-[background-color,border-color,transform] duration-150 hover:-translate-y-px hover:border-border/80 hover:bg-muted/20",
                folder.layout === "wide" && "lg:col-span-7",
                folder.layout === "standard" && "lg:col-span-5",
                folder.layout === "full" && "lg:col-span-12",
              )}
              id={folder.anchorId}
              key={folder.id}
              style={{ boxShadow: "var(--ring-hairline)" }}
            >
              <div
                className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(#0000001a_1px,transparent_1px)] opacity-20 [background-size:24px_24px] dark:bg-[radial-gradient(#ffffff1a_1px,transparent_1px)] dark:opacity-5"
                aria-hidden="true"
              />
              <div className="relative z-10 flex h-full flex-col">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border/50 bg-background/40">
                      <Icon className="size-5 text-primary opacity-85" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p
                        className="truncate font-mono text-muted-foreground text-xs"
                        translate="no"
                      >
                        {folder.sourcePath}
                      </p>
                      <h3
                        className="mt-2 text-2xl font-semibold text-foreground text-pretty"
                        style={{ letterSpacing: "var(--tracking-heading)" }}
                      >
                        {copyFor(folder.title, locale)}
                      </h3>
                      <p className="mt-4 max-w-2xl text-muted-foreground text-sm leading-relaxed">
                        {copyFor(folder.summary, locale)}
                      </p>
                    </div>
                  </div>
                  <a
                    aria-label={`${localized("docs", locale)}: ${copyFor(folder.title, locale)}`}
                    className="group/link inline-flex w-fit shrink-0 items-center gap-3 rounded-full font-semibold text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    href={folder.docsHref}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span className="flex size-8 items-center justify-center rounded-full border border-border/50 bg-background/50 text-muted-foreground backdrop-blur-sm transition-colors group-hover/link:border-foreground group-hover/link:text-foreground dark:border-border dark:group-hover/link:border-border dark:group-hover/link:text-white">
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </span>
                    <span>{localized("docs", locale)}</span>
                  </a>
                </div>

                <div className="mt-6">
                  <SourceMetrics folder={folder} locale={locale} />
                </div>

                <TopologyVisual folder={folder} locale={locale} />

                <BoundarySummary folder={folder} locale={locale} />

                <div className="mt-auto border-border/50 border-t pt-5">
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.45fr)]">
                    <div className="min-w-0">
                      <h4 className="mb-2 font-semibold text-foreground text-xs">
                        {localized("interfaces", locale)}
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {folder.interfaces.map((name) => (
                          <span
                            className="rounded-md border border-border/50 bg-background/40 px-2 py-1 font-mono text-[11px] text-foreground/80"
                            key={name}
                            translate="no"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ProofMetrics folder={folder} locale={locale} />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </AnimateInGroup>
    </section>
  );
}
