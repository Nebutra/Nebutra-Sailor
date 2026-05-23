import { AnimatedSpan, Badge, DotPattern, Terminal, TypingAnimation } from "@nebutra/ui/primitives";
import type { PackageFeatureEntry } from "../package-feature-data";
import { entrySignature, getSpecimenNodes } from "./specimen-utils";

type Props = {
  entry: PackageFeatureEntry;
  locale: "en" | "zh";
  compact?: boolean;
};

const COMMAND_VERBS: Record<string, string> = {
  cli: "release",
  preset: "preset apply",
  sanity: "studio deploy",
  supabase: "db migrate",
  compliance: "audit run",
  ops: "ops verify",
};

const ZH_LABELS = {
  ready: "✓ 环境就绪",
  checking: "✓ 校验",
  applying: "✓ 应用",
  publishing: "✓ 发布",
  done: "✓ 全部完成 · 0 错误",
  status: "运行中",
  duration: "耗时 4.2 秒",
} as const;

const EN_LABELS = {
  ready: "✓ Environment ready",
  checking: "✓ Checking",
  applying: "✓ Applying",
  publishing: "✓ Publishing",
  done: "✓ All checks passed · 0 errors",
  status: "RUNNING",
  duration: "completed in 4.2s",
} as const;

function pickVerb(entry: PackageFeatureEntry): string {
  // Vary the command per-entry so siblings render distinctly.
  const matched = Object.entries(COMMAND_VERBS).find(
    ([key]) => entry.slug.includes(key) || entry.group === key,
  );
  return matched?.[1] ?? "ops verify";
}

/**
 * Operations specimen — release tape.
 *
 * Renders an animated, sequenced macOS-style terminal recording an automated
 * CLI run (release, preset apply, audit, ...). Uses real `@nebutra/ui`
 * primitives end-to-end: `Terminal`, `TypingAnimation`, `AnimatedSpan`,
 * `Badge`, and `DotPattern`.
 */
export function TapeSpecimen({ entry, locale, compact = false }: Props) {
  const nodes = getSpecimenNodes(entry, 4);
  const sig = entrySignature(entry);
  const verb = pickVerb(entry);
  const labels = locale === "zh" ? ZH_LABELS : EN_LABELS;
  const verbLabels =
    locale === "zh"
      ? { checking: "校验", applying: "应用", publishing: "发布" }
      : { checking: "Checking", applying: "Applying", publishing: "Publishing" };

  const command = `$ pnpm nebutra ${verb} --tenant ${entry.slug}`;
  const minHeightStyle = compact
    ? { minHeight: "240px" }
    : { minHeight: "clamp(380px, 50vw, 520px)" };

  if (compact) {
    return (
      <div
        className="relative w-full overflow-hidden"
        role="img"
        aria-label={`${entry.label} release tape specimen`}
        style={minHeightStyle}
      >
        <DotPattern
          aria-hidden="true"
          className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)] text-muted-foreground/40"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 30%, ${entry.tone.halo}, transparent 70%)`,
          }}
        />
        <div className="relative flex h-full flex-col justify-center gap-2 px-6 font-mono text-xs">
          <AnimatedSpan delay={0} className="text-muted-foreground" startOnView>
            {command}
          </AnimatedSpan>
          <AnimatedSpan delay={300} className="text-emerald-500" startOnView>
            {labels.checking} {nodes[0] ?? entry.label}
          </AnimatedSpan>
          <AnimatedSpan delay={600} className="text-emerald-500" startOnView>
            {labels.done}
          </AnimatedSpan>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex w-full items-center justify-center overflow-hidden"
      role="img"
      aria-label={`${entry.label} release tape specimen`}
      style={minHeightStyle}
    >
      <DotPattern
        aria-hidden="true"
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)] text-muted-foreground/40"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${entry.tone.halo}, transparent 70%)`,
        }}
      />

      <div className="relative flex w-full max-w-2xl flex-col gap-3 px-6">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" size="sm" className="font-mono uppercase tracking-[0.18em]">
            <span
              aria-hidden="true"
              className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-500"
              style={{ boxShadow: "0 0 8px currentColor", color: "var(--status-success, #10b981)" }}
            />
            {labels.status}
          </Badge>
          <Badge variant="outline" size="sm" className="font-mono">
            {entry.slug}.tape · {sig}
          </Badge>
        </div>

        <Terminal
          sequence
          startOnView
          className="max-h-none max-w-none bg-background/80 backdrop-blur-sm"
        >
          <TypingAnimation duration={28} className="text-muted-foreground">
            {command}
          </TypingAnimation>
          <AnimatedSpan className="text-muted-foreground">{labels.ready}</AnimatedSpan>
          <AnimatedSpan className="text-emerald-500">
            {verbLabels.checking} {nodes[0] ?? entry.label}
          </AnimatedSpan>
          <AnimatedSpan className="text-emerald-500">
            {verbLabels.applying} {nodes[1] ?? "manifest"}
          </AnimatedSpan>
          <AnimatedSpan className="text-emerald-500">
            {verbLabels.publishing} {nodes[2] ?? "release"}
          </AnimatedSpan>
          <AnimatedSpan className="text-muted-foreground">
            → {nodes[3] ?? "artifact"} · {sig}
          </AnimatedSpan>
          <TypingAnimation duration={22} className="mt-2 text-emerald-500">
            {labels.done}
          </TypingAnimation>
          <AnimatedSpan className="text-muted-foreground">{labels.duration}</AnimatedSpan>
        </Terminal>
      </div>
    </div>
  );
}
