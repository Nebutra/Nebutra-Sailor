import {
  Api,
  ArrowRight,
  Connection,
  FileDependency,
  GitBranch,
  Layers,
  LockClosed,
} from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { cn } from "@nebutra/ui/utils";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
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
    en: "Capability boundaries built as composable systems.",
    zh: "把能力边界做成可组合系统。",
  },
  description: {
    en: "The map below turns high-value folders into product-grade capability surfaces: one owner, one interface, one visible boundary.",
    zh: "下面把高价值目录翻译成产品化能力面：一个 owner、一个接口、一个清晰边界。",
  },
  docs: {
    en: "Open docs",
    zh: "打开文档",
  },
  sourceFiles: {
    en: "source",
    zh: "源码",
  },
  tests: {
    en: "tests",
    zh: "测试",
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

const VISUAL_TONES: Record<CapabilityVisualVariant, string> = {
  bus: "from-cyan-500/18 via-blue-500/8 to-transparent",
  ledger: "from-emerald-500/18 via-teal-500/8 to-transparent",
  orchestra: "from-indigo-500/20 via-sky-500/10 to-transparent",
  request: "from-violet-500/18 via-blue-500/8 to-transparent",
  stack: "from-blue-500/18 via-indigo-500/8 to-transparent",
  supply: "from-rose-500/16 via-orange-500/8 to-transparent",
  trust: "from-sky-500/18 via-emerald-500/8 to-transparent",
};

function localized(section: keyof typeof SECTION_COPY, locale: Locale) {
  return locale === "zh" ? SECTION_COPY[section].zh : SECTION_COPY[section].en;
}

function moduleLabel(label: string) {
  return label.replace("@nebutra/", "").replace("middlewares/", "").replace("routes/", "");
}

function ShortPath({ path }: { path: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[11px] text-muted-foreground">
      {path}
    </span>
  );
}

function VisualChip({ children, className }: { children: string; className?: string }) {
  return (
    <span
      className={cn(
        "max-w-[8.75rem] truncate rounded-full border border-white/10 bg-background/55 px-2.5 py-1 font-mono text-[10px] text-foreground/70 shadow-sm backdrop-blur-md sm:max-w-[10rem] sm:px-3 sm:py-1.5 sm:text-[11px]",
        className,
      )}
      translate="no"
    >
      {children}
    </span>
  );
}

function VisualStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-white/10 bg-background/50 px-3 py-1.5 backdrop-blur-md">
      <p className="inline font-mono text-[11px] text-foreground/80" translate="no">
        {value}
      </p>
      <p className="ml-1 inline text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function ArtworkShell({
  children,
  variant,
}: {
  children: ReactNode;
  variant: CapabilityVisualVariant;
}) {
  return (
    <div className="relative h-[380px] min-h-[380px] overflow-hidden rounded-b-[var(--radius-panel)]">
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 top-8 bg-gradient-to-br blur-3xl",
          VISUAL_TONES[variant],
        )}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(#0000001a_1px,transparent_1px)] opacity-25 [background-size:24px_24px] dark:bg-[radial-gradient(#ffffff1a_1px,transparent_1px)] dark:opacity-5"
        aria-hidden="true"
      />
      <div className="absolute inset-x-6 bottom-0 top-8 rounded-t-[2rem] border border-white/10 bg-background/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-[2px] sm:inset-x-10" />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

function FloatingOrchestra({
  folder,
  variant,
}: {
  folder: CapabilityFolder;
  variant: CapabilityVisualVariant;
}) {
  const [core, ...nodes] = folder.topology.nodes;

  return (
    <ArtworkShell variant={variant}>
      <div
        className="absolute left-1/2 top-[55%] size-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
        aria-hidden="true"
      />
      <div
        className="absolute left-1/2 top-[55%] size-[15rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/20"
        aria-hidden="true"
      />
      <div className="absolute left-1/2 top-[55%] flex h-32 w-52 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2rem] border border-primary/30 bg-background/78 px-6 text-center shadow-[0_0_80px_rgba(86,120,255,0.22)] backdrop-blur-xl">
        <div>
          <GitBranch className="mx-auto mb-3 size-5 text-primary" aria-hidden="true" />
          <p className="font-mono text-foreground text-xs" translate="no">
            {core ? moduleLabel(core.label) : null}
          </p>
        </div>
      </div>
      {nodes.slice(0, 5).map((node, index) => {
        const positions = [
          "left-[6%] top-[28%]",
          "right-[8%] top-[24%]",
          "left-[11%] bottom-[24%]",
          "right-[10%] bottom-[22%]",
          "left-1/2 top-[7%] -translate-x-1/2",
        ];
        return (
          <VisualChip className={cn("absolute", positions[index])} key={node.label}>
            {moduleLabel(node.label)}
          </VisualChip>
        );
      })}
    </ArtworkShell>
  );
}

function LayeredStack({
  folder,
  variant,
}: {
  folder: CapabilityFolder;
  variant: CapabilityVisualVariant;
}) {
  return (
    <ArtworkShell variant={variant}>
      <div className="absolute inset-x-10 bottom-6 h-16 rounded-full bg-primary/10 blur-3xl" />
      {folder.topology.nodes.slice(0, 5).map((node, index) => (
        <div
          className={cn(
            "absolute left-1/2 flex h-14 w-[78%] -translate-x-1/2 items-center justify-between rounded-[var(--radius-sm)] border border-white/10 bg-background/62 px-5 shadow-2xl backdrop-blur-xl transition-transform duration-300 group-hover/card:-translate-y-1",
            index === 0 && "top-[18%] z-50 border-primary/30 bg-primary/10",
            index === 1 && "top-[33%] z-40 w-[72%]",
            index === 2 && "top-[48%] z-30 w-[66%]",
            index === 3 && "top-[63%] z-20 w-[60%]",
            index === 4 && "top-[78%] z-10 w-[54%]",
          )}
          key={node.label}
        >
          <span className="font-mono text-[11px] text-foreground/85" translate="no">
            {moduleLabel(node.label)}
          </span>
          <span className="size-2 rounded-full bg-primary/70" />
        </div>
      ))}
    </ArtworkShell>
  );
}

function Corridor({
  folder,
  icon: Icon,
  variant,
}: {
  folder: CapabilityFolder;
  icon: ComponentType<{ className?: string }>;
  variant: CapabilityVisualVariant;
}) {
  return (
    <ArtworkShell variant={variant}>
      <div
        className="absolute left-12 right-12 top-[58%] h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent"
        aria-hidden="true"
      />
      <div className="grid h-full grid-cols-5 items-center gap-3 px-7 pt-10">
        {folder.topology.nodes.slice(0, 5).map((node, index) => (
          <div className="relative flex flex-col items-center gap-4" key={node.label}>
            <div
              className={cn(
                "flex size-14 items-center justify-center rounded-full border border-white/10 bg-background/68 shadow-xl backdrop-blur-xl",
                index === 0 && "border-primary/30 bg-primary/10",
              )}
            >
              {index === 0 ? (
                <Icon className="size-5 text-primary" aria-hidden="true" />
              ) : (
                <span className="font-mono text-xs text-foreground/80">{index + 1}</span>
              )}
            </div>
            <span
              className="max-w-[7.5rem] truncate text-center font-mono text-[10px] text-muted-foreground"
              translate="no"
            >
              {moduleLabel(node.label)}
            </span>
          </div>
        ))}
      </div>
    </ArtworkShell>
  );
}

function IntegrationBus({
  folder,
  variant,
}: {
  folder: CapabilityFolder;
  variant: CapabilityVisualVariant;
}) {
  return (
    <ArtworkShell variant={variant}>
      <div className="absolute left-1/2 top-[22%] h-52 w-44 -translate-x-1/2 rounded-[2rem] border border-primary/30 bg-primary/10 shadow-[0_0_90px_rgba(45,212,191,0.18)] backdrop-blur-xl">
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <Connection className="size-6 text-primary" aria-hidden="true" />
          <span className="font-mono text-foreground text-xs">ports</span>
        </div>
      </div>
      {folder.topology.nodes.slice(0, 6).map((node, index) => {
        const positions = [
          "left-[7%] top-[18%]",
          "right-[8%] top-[19%]",
          "left-[9%] top-[45%]",
          "right-[9%] top-[45%]",
          "left-[12%] bottom-[17%]",
          "right-[12%] bottom-[17%]",
        ];
        return (
          <VisualChip className={cn("absolute", positions[index])} key={node.label}>
            {moduleLabel(node.label)}
          </VisualChip>
        );
      })}
    </ArtworkShell>
  );
}

function LedgerTable({
  folder,
  variant,
}: {
  folder: CapabilityFolder;
  variant: CapabilityVisualVariant;
}) {
  return (
    <ArtworkShell variant={variant}>
      <div className="mx-auto mt-16 max-w-lg overflow-hidden rounded-[var(--radius-panel)] border border-white/10 bg-background/62 shadow-2xl backdrop-blur-xl">
        <div className="grid grid-cols-[1fr_5rem] border-white/10 border-b px-4 py-3 font-mono text-[11px] text-muted-foreground">
          <span>contract</span>
          <span className="text-right">owner</span>
        </div>
        {folder.topology.nodes.slice(0, 5).map((node, index) => (
          <div
            className="grid grid-cols-[1fr_5rem] items-center border-white/10 border-b px-4 py-3 last:border-b-0"
            key={node.label}
          >
            <span className="truncate font-mono text-[11px] text-foreground/85" translate="no">
              {moduleLabel(node.label)}
            </span>
            <span className="text-right font-mono text-[10px] text-muted-foreground">
              {index === 0 ? "core" : "port"}
            </span>
          </div>
        ))}
      </div>
    </ArtworkShell>
  );
}

function CapabilityArtwork({ folder, locale }: { folder: CapabilityFolder; locale: Locale }) {
  const Icon = TOPOLOGY_ICONS[folder.topology.variant];
  const variant = folder.topology.variant;

  return (
    <div className="relative mt-8 flex-1 overflow-hidden">
      <div className="pointer-events-none absolute right-8 top-1 z-20 hidden items-center gap-2 sm:flex">
        <div className="flex gap-2 opacity-70 transition-opacity duration-300 group-hover/card:opacity-100">
          <VisualStat
            label={copyFor(folder.sourceStats.unitLabel, locale)}
            value={String(folder.sourceStats.unitCount)}
          />
          <VisualStat
            label={localized("tests", locale)}
            value={String(folder.sourceStats.testFiles)}
          />
        </div>
      </div>
      <div className="relative z-10 px-6 pb-0 sm:px-10">
        <p className="mb-3 truncate font-semibold text-foreground/90 text-sm">
          {copyFor(folder.topology.title, locale)}
        </p>
      </div>
      <div className="relative z-10">
        {variant === "orchestra" ? <FloatingOrchestra folder={folder} variant={variant} /> : null}
        {variant === "stack" ? <LayeredStack folder={folder} variant={variant} /> : null}
        {variant === "trust" || variant === "supply" || variant === "request" ? (
          <Corridor folder={folder} icon={Icon} variant={variant} />
        ) : null}
        {variant === "bus" ? <IntegrationBus folder={folder} variant={variant} /> : null}
        {variant === "ledger" ? <LedgerTable folder={folder} variant={variant} /> : null}
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
        <div className="mb-8 max-w-3xl">
          <p className="mb-3 font-bold text-primary text-xs uppercase tracking-[0.2em]">
            {localized("eyebrow", locale)}
          </p>
          <h2 className="text-3xl font-semibold text-foreground text-pretty sm:text-4xl">
            {localized("title", locale)}
          </h2>
          <p className="mt-4 max-w-2xl font-medium text-base text-muted-foreground leading-relaxed">
            {localized("description", locale)}
          </p>
        </div>
      </AnimateIn>

      <AnimateInGroup stagger="fast" className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {CAPABILITY_FOLDERS.map((folder) => {
          const Icon = folder.icon;
          const featureHref = `/${locale}/features/${folder.id}`;

          return (
            <article
              className={cn(
                "group/card relative flex min-h-[680px] scroll-mt-28 flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--neutral-6)] bg-background transition-all duration-500 hover:-translate-y-0.5 hover:border-foreground/20 dark:bg-background dark:hover:border-border",
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
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-1/2 bg-gradient-to-t from-primary/[0.04] to-transparent" />

              <div className="relative z-10 flex-none px-8 pt-10 sm:px-10">
                <div className="mb-6 flex items-center gap-3">
                  <Link
                    aria-label={`${copyFor(folder.title, locale)} feature page`}
                    className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border/50 bg-background/50 text-primary backdrop-blur-sm transition-colors hover:border-primary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    href={featureHref}
                  >
                    <Icon className="size-5 opacity-85" aria-hidden="true" />
                  </Link>
                  <ShortPath path={folder.sourcePath} />
                </div>

                <h3 className="max-w-xl text-[26px] font-semibold text-foreground leading-tight sm:text-[32px] dark:text-white">
                  {copyFor(folder.title, locale)}
                </h3>
                <p className="mt-4 line-clamp-3 max-w-sm font-medium text-[15px] text-muted-foreground leading-relaxed sm:text-base dark:text-zinc-400">
                  {copyFor(folder.summary, locale)}
                </p>

                <a
                  aria-label={`${localized("docs", locale)}: ${copyFor(folder.title, locale)}`}
                  className="group/link mt-8 flex w-fit items-center gap-3 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  href={folder.docsHref}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="flex size-8 items-center justify-center rounded-full border border-border/50 bg-background/50 text-muted-foreground backdrop-blur-sm transition-colors group-hover/link:border-foreground group-hover/link:text-foreground dark:border-border dark:group-hover/link:border-border dark:group-hover/link:text-white">
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                  <span className="font-semibold text-muted-foreground text-sm transition-colors group-hover/link:text-foreground dark:group-hover/link:text-white">
                    {localized("docs", locale)}
                  </span>
                </a>
              </div>

              <CapabilityArtwork folder={folder} locale={locale} />
            </article>
          );
        })}
      </AnimateInGroup>
    </section>
  );
}
