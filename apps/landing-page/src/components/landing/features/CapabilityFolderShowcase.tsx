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
    en: "Source-Aligned Capability Map",
    zh: "源码对齐的能力地图",
  },
  title: {
    en: "Each high-value folder now gets its own product-grade surface.",
    zh: "每个高价值目录，都应该有自己的产品级展示面。",
  },
  description: {
    en: "These cards are not a decorative tree duplicate. Each one is shaped from real package counts, source files, tests, package responsibilities, and the architectural boundary the folder owns.",
    zh: "这些卡片不是目录树的装饰性重复。每张卡都来自真实包数量、源码文件、测试、包职责，以及该目录真正拥有的架构边界。",
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
  adapter: "border-[var(--neutral-6)] bg-[var(--neutral-2)] text-muted-foreground",
  core: "border-primary/35 bg-primary/10 text-foreground",
  policy: "border-[var(--neutral-7)] bg-[var(--neutral-1)] text-foreground",
  port: "border-[var(--neutral-6)] bg-background text-foreground",
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
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-sm)] border border-[var(--neutral-6)] bg-[var(--neutral-6)] sm:grid-cols-4">
      {metrics.map((metric) => (
        <div className="bg-background px-3 py-2.5" key={metric.label}>
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
        <div className="relative rounded-[var(--radius-sm)] border border-primary/35 bg-primary/10 p-4 text-center">
          <div className="mx-auto mb-3 flex size-9 items-center justify-center rounded-full border border-primary/35 bg-background">
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
            <span className="flex size-7 items-center justify-center rounded-full border border-[var(--neutral-6)] bg-background font-mono text-[11px] text-muted-foreground">
              {index + 1}
            </span>
            {index < folder.topology.nodes.length - 1 ? (
              <span className="mt-1 h-full min-h-5 w-px bg-[var(--neutral-6)]" aria-hidden="true" />
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
              className="absolute top-1/2 right-[-0.6rem] hidden h-px w-3 bg-[var(--neutral-7)] md:block"
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
      <div className="flex items-center justify-center rounded-[var(--radius-sm)] border border-primary/35 bg-primary/10 p-4 text-center">
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
    <div className="divide-y divide-[var(--neutral-6)] border-[var(--neutral-6)] border-y">
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
    <div className="mt-5 border-[var(--neutral-6)] border-y py-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 font-semibold text-foreground text-sm">
            {copyFor(folder.topology.title, locale)}
          </p>
          <p className="max-w-xl text-muted-foreground text-xs leading-relaxed">
            {copyFor(folder.designIntent, locale)}
          </p>
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--neutral-6)] bg-[var(--neutral-1)]">
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

function ContractList({
  items,
  label,
  locale,
}: {
  items: CapabilityFolder["owns"];
  label: string;
  locale: Locale;
}) {
  return (
    <div>
      <h4 className="mb-2 font-semibold text-foreground text-xs">{label}</h4>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li className="flex gap-2 text-muted-foreground text-xs leading-relaxed" key={item.en}>
            <CheckCircle className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span>{copyFor(item, locale)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EvidenceGrid({ folder, locale }: { folder: CapabilityFolder; locale: Locale }) {
  return (
    <div>
      <h4 className="mb-2 font-semibold text-foreground text-xs">
        {localized("evidence", locale)}
      </h4>
      <div className="grid gap-px overflow-hidden rounded-[var(--radius-sm)] border border-[var(--neutral-6)] bg-[var(--neutral-6)]">
        {folder.evidence.map((metric) => (
          <div
            className="grid grid-cols-[4.5rem_minmax(0,1fr)] bg-background"
            key={metric.label.en}
          >
            <div className="border-[var(--neutral-6)] border-r px-3 py-2">
              <p className="font-mono text-foreground text-sm" translate="no">
                {metric.value}
              </p>
              <p className="text-[10px] text-muted-foreground">{copyFor(metric.label, locale)}</p>
            </div>
            <p className="px-3 py-2 text-muted-foreground text-xs leading-relaxed">
              {copyFor(metric.detail, locale)}
            </p>
          </div>
        ))}
      </div>
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
          <div className="rounded-[var(--radius-panel)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-4">
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
                "scroll-mt-28 rounded-[var(--radius-panel)] border border-[var(--neutral-6)] bg-background/78 p-5 shadow-sm backdrop-blur-md transition-[border-color,background-color,transform] duration-200 hover:-translate-y-px hover:border-primary/35 dark:bg-[var(--neutral-2)]/72",
                folder.layout === "wide" && "lg:col-span-7",
                folder.layout === "standard" && "lg:col-span-5",
                folder.layout === "full" && "lg:col-span-12",
              )}
              id={folder.anchorId}
              key={folder.id}
            >
              <div
                className={cn(
                  "grid gap-6",
                  folder.layout === "full" &&
                    "xl:grid-cols-[minmax(0,0.64fr)_minmax(280px,0.36fr)]",
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--neutral-6)] bg-[var(--neutral-1)]">
                      <Icon className="size-5 text-primary" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-muted-foreground text-xs">
                        {localized("source", locale)}
                      </p>
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
                    </div>
                  </div>

                  <p className="mt-4 max-w-2xl text-muted-foreground text-sm leading-relaxed">
                    {copyFor(folder.summary, locale)}
                  </p>

                  <div className="mt-5">
                    <SourceMetrics folder={folder} locale={locale} />
                  </div>

                  <TopologyVisual folder={folder} locale={locale} />

                  <div className="mt-5">
                    <h4 className="mb-2 font-semibold text-foreground text-xs">
                      {localized("focus", locale)}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {folder.focusPackages.map((name) => (
                        <span
                          className="rounded-md border border-[var(--neutral-6)] bg-[var(--neutral-1)] px-2 py-1 font-mono text-[11px] text-foreground/80"
                          key={name}
                          translate="no"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <aside
                  className={cn(
                    "flex min-w-0 flex-col gap-5 border-[var(--neutral-6)] border-t pt-5",
                    folder.layout === "full" && "xl:border-t-0 xl:border-l xl:pt-0 xl:pl-5",
                  )}
                >
                  <div>
                    <p className="font-mono text-3xl text-foreground" translate="no">
                      {folder.signature.value}
                    </p>
                    <p className="mt-1 font-semibold text-foreground text-sm">
                      {copyFor(folder.signature.label, locale)}
                    </p>
                    <p className="mt-2 text-muted-foreground text-xs leading-relaxed">
                      {copyFor(folder.signature.detail, locale)}
                    </p>
                  </div>

                  <EvidenceGrid folder={folder} locale={locale} />

                  <div>
                    <h4 className="mb-3 font-semibold text-foreground text-xs">
                      {localized("contract", locale)}
                    </h4>
                    <div className="grid gap-4">
                      <ContractList
                        items={folder.owns}
                        label={localized("owns", locale)}
                        locale={locale}
                      />
                      <ContractList
                        items={folder.boundaries}
                        label={localized("boundaries", locale)}
                        locale={locale}
                      />
                      <ContractList
                        items={folder.proof}
                        label={localized("proof", locale)}
                        locale={locale}
                      />
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col gap-4">
                    <div>
                      <p className="mb-2 font-medium text-muted-foreground text-xs">
                        {localized("interfaces", locale)}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {folder.interfaces.map((name) => (
                          <span
                            className="rounded-md border border-[var(--neutral-6)] bg-[var(--neutral-1)] px-2 py-1 font-mono text-[11px] text-foreground/80"
                            key={name}
                            translate="no"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <a
                      aria-label={`${localized("docs", locale)}: ${copyFor(folder.title, locale)}`}
                      className="group/link inline-flex w-fit items-center gap-2 rounded-full border border-[var(--neutral-6)] bg-background px-3 py-2 font-semibold text-foreground text-sm transition-[border-color,color] hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      href={folder.docsHref}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {localized("docs", locale)}
                      <ArrowRight
                        className="size-4 transition-transform group-hover/link:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </a>
                  </div>
                </aside>
              </div>
            </article>
          );
        })}
      </AnimateInGroup>
    </section>
  );
}
