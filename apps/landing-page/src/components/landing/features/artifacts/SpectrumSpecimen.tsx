import { BlendMode, Droplet, Layers } from "@nebutra/icons";
import {
  AuroraText,
  Badge,
  BorderTrail,
  ColorBadge,
  Heading,
  LineShadowText,
  Text,
} from "@nebutra/ui/primitives";
import type { PackageFeatureEntry } from "../package-feature-data";
import { entrySignature, getSpecimenNodes } from "./specimen-utils";

type Props = {
  entry: PackageFeatureEntry;
  locale: "en" | "zh";
  compact?: boolean;
};

const LINEAGE_VARIANTS = [
  "blue-subtle",
  "purple-subtle",
  "teal-subtle",
  "pink-subtle",
  "amber-subtle",
] as const;

/**
 * Design system specimen — a token spectrum / supply chain.
 *
 * Built entirely from @nebutra/ui/primitives + @nebutra/icons:
 *   - AuroraText      → hero "spectrum" word
 *   - BorderTrail     → animated outline around the gradient sweep
 *   - Badge           → 12-step scale chips
 *   - ColorBadge      → lineage callouts (one per node)
 *   - Heading + Text  → type ramp
 *   - LineShadowText  → typography flourish ("Aa Bb Cc Dd")
 */
export function SpectrumSpecimen({ entry, locale, compact = false }: Props) {
  const nodes = getSpecimenNodes(entry, 5);
  const accent = entry.tone.accent;
  const secondary = entry.tone.secondary;
  const sig = entrySignature(entry);
  const minHeightStyle = compact
    ? { minHeight: "240px" }
    : { minHeight: "clamp(380px, 50vw, 520px)" };

  return (
    <div
      className="relative flex w-full flex-col gap-4 overflow-hidden p-5 sm:p-6"
      role="img"
      aria-label={`${entry.label} token spectrum specimen`}
      style={minHeightStyle}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${entry.tone.halo}, transparent 70%)`,
        }}
      />

      {/* Eyebrow row */}
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Droplet className="size-3.5" aria-hidden="true" />
          <Text as="span" variant="caption" className="font-mono uppercase tracking-[0.32em]">
            spectrum · DTCG
          </Text>
        </div>
        <AuroraText
          className="font-mono text-[11px] uppercase tracking-[0.32em]"
          colors={[secondary, accent, secondary]}
          speed={0.6}
        >
          {locale === "zh" ? "TOKEN 供应链" : "TOKEN SUPPLY CHAIN"}
        </AuroraText>
      </div>

      {/* Gradient sweep with animated border trail */}
      <div
        className="relative overflow-hidden rounded-[var(--radius-md)] border"
        style={{
          borderColor: entry.tone.hairline,
          minHeight: compact ? "64px" : "96px",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: entry.tone.gradient }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, transparent 60%, color-mix(in oklch, var(--background) 35%, transparent))",
          }}
        />
        <div className="absolute inset-x-3 bottom-2 flex items-end justify-between font-mono text-[10px] uppercase tracking-[0.32em] text-white/70">
          <span className="flex items-center gap-1.5">
            <BlendMode className="size-3" aria-hidden="true" />
            brand · primary
          </span>
          <span>brand · accent</span>
        </div>
        <BorderTrail
          size={compact ? 40 : 64}
          style={{
            background: `linear-gradient(90deg, ${secondary}, ${accent})`,
          }}
        />
      </div>

      {/* 12-step scale */}
      <div className="relative z-10 flex flex-wrap items-center gap-1">
        {Array.from({ length: 12 }).map((_, index) => {
          const t = index / 11;
          return (
            <Badge
              // biome-ignore lint/suspicious/noArrayIndexKey: positional decoration
              key={index}
              variant="outline"
              size="sm"
              className="h-5 min-w-[1.75rem] justify-center border px-0 font-mono text-[9px] text-white/85"
              style={{
                borderColor: entry.tone.hairline,
                background: `color-mix(in oklch, ${secondary} ${10 + t * 70}%, ${accent} ${(1 - t) * 60}%)`,
              }}
            >
              {String(index + 1).padStart(2, "0")}
            </Badge>
          );
        })}
      </div>

      {/* Type ramp — only on full variant */}
      {!compact ? (
        <div
          className="relative z-10 flex flex-col gap-2 rounded-[var(--radius-md)] border px-4 py-3 backdrop-blur-md"
          style={{
            borderColor: entry.tone.hairline,
            background: "color-mix(in oklch, var(--background) 60%, transparent)",
          }}
        >
          <div className="flex items-baseline justify-between gap-3">
            <Heading level={2} className="leading-none">
              <LineShadowText shadowColor={accent}>Aa</LineShadowText>{" "}
              <LineShadowText shadowColor={secondary}>Bb</LineShadowText>
            </Heading>
            <Text as="span" variant="caption" className="font-mono uppercase tracking-[0.32em]">
              type · ramp
            </Text>
          </div>
          <div className="flex items-center gap-4">
            <Heading level={4} className="leading-none">
              Cc Dd
            </Heading>
            <Text variant="body-sm" color="muted" className="font-mono">
              16 / 24 / 32
            </Text>
          </div>
        </div>
      ) : null}

      {/* Lineage callouts */}
      <div className="relative z-10 flex flex-wrap gap-2">
        {nodes.map((node, index) => (
          <ColorBadge
            key={`${node}-${index}`}
            variant={LINEAGE_VARIANTS[index % LINEAGE_VARIANTS.length]}
            size="sm"
            capitalize={false}
            icon={<Layers />}
            className="font-mono tracking-[0.12em]"
          >
            {node}
          </ColorBadge>
        ))}
      </div>

      {/* Annotation rail */}
      {!compact ? (
        <div className="pointer-events-none relative z-10 mt-auto flex items-end justify-between">
          <Text as="span" variant="caption" className="font-mono uppercase tracking-[0.32em]">
            sig {sig}
          </Text>
          <Text
            as="span"
            variant="caption"
            color="muted"
            className="font-mono uppercase tracking-[0.32em]"
          >
            {locale === "zh" ? "供应链 token" : "token supply chain"}
          </Text>
        </div>
      ) : null}
    </div>
  );
}
