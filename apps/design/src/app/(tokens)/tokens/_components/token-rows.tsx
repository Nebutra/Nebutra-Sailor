/**
 * Row renderers shared by the token pages.
 *
 * These take a `MeasuredColor` or a `SimpleToken` — objects computed in
 * `src/lib/tokens` from the DTCG source — and render them. They contain no token
 * values of their own.
 */

import type { MeasuredColor, Pairing, SimpleToken, Token } from "@/lib/tokens";
import { formatRatio, TIER_LABEL } from "@/lib/tokens";
import { Chip, Mono, Td, Th, Tr, VarName } from "./primitives";

/** A colour chip painted with the token's own resolved value. */
export function Swatch({
  hex,
  size = "md",
  title,
}: {
  hex: string | null;
  size?: "sm" | "md" | "lg";
  title?: string;
}) {
  const dimension = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-5 w-5" : "h-9 w-9";
  if (hex === null) {
    return (
      <div
        className={`${dimension} shrink-0 rounded-md bg-muted`}
        title="value resolves at runtime — cannot be painted at build time"
      />
    );
  }
  return (
    <div
      className={`${dimension} shrink-0 rounded-md shadow-ambient-sm`}
      style={{ backgroundColor: hex }}
      title={title ?? hex}
    />
  );
}

/** OKLCH read-out. Computed from the resolved value; never stored. */
export function OklchCell({ entry }: { entry: MeasuredColor }) {
  if (!entry.oklch) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const { l, c, h } = entry.oklch;
  return (
    <span className="font-mono text-[12px] text-muted-foreground tabular-nums">
      L* {(l * 100).toFixed(1)} · C {c.toFixed(3)} · H {h.toFixed(1)}°
    </span>
  );
}

function verdictTone(pairing: Pairing) {
  if (pairing.verdict.passes === null) return "neutral" as const;
  if (pairing.verdict.passes) return "pass" as const;
  return pairing.normative ? ("fail" as const) : ("warn" as const);
}

function verdictLabel(pairing: Pairing): string {
  const { verdict } = pairing;
  if (verdict.required === null) return formatRatio(verdict.ratio);
  if (verdict.passes) return formatRatio(verdict.ratio);
  return `${formatRatio(verdict.ratio)} · below ${verdict.required}:1`;
}

/** One measured pairing, with the bar it is measured against. */
export function PairingChip({ pairing }: { pairing: Pairing }) {
  const large =
    pairing.verdict.passes === false && pairing.verdict.passesLarge
      ? " · clears the 3:1 large-text bar"
      : "";
  return (
    <Chip
      tone={verdictTone(pairing)}
      title={`vs --${pairing.backdrop.cssVar}: ${pairing.basis}${large}`}
    >
      {verdictLabel(pairing)}
      <span className="font-normal opacity-70">on --{pairing.backdrop.cssVar}</span>
    </Chip>
  );
}

export function PairingList({ entry }: { entry: MeasuredColor }) {
  if (entry.pairings.length === 0) {
    return (
      <span className="text-[12px] text-muted-foreground italic">
        no backdrop declared in the source
      </span>
    );
  }
  return (
    <span className="flex flex-wrap gap-1">
      {entry.pairings.map((pairing) => (
        <PairingChip key={`${pairing.backdrop.cssVar}-${pairing.basis}`} pairing={pairing} />
      ))}
    </span>
  );
}

/** Provenance: which file won, whether it is aliased, whether it is computed. */
export function Provenance({ token }: { token: Token }) {
  return (
    <span className="flex flex-wrap items-center gap-1">
      <Chip
        tone="neutral"
        title={`declared in tokens/${token.source === "core" || token.source === "semantic" ? "" : "themes/"}${token.source}.json`}
      >
        {token.source}.json
      </Chip>
      {token.derivation ? (
        <Chip
          tone="accent"
          title={`computed at build time by scripts/derive-border-tier.mjs in ${token.derivation.space} — this value is not written anywhere in the source`}
        >
          computed
        </Chip>
      ) : null}
      {token.isAlias && !token.derivation ? (
        <Chip tone="neutral" title={`alias of {${token.aliasTarget}}`}>
          → {token.aliasTarget}
        </Chip>
      ) : null}
      {token.overrides.length > 0 ? (
        <Chip
          tone="warn"
          title={`also declared in ${token.overrides.join(", ")} — this mode's declaration wins`}
        >
          overrides {token.overrides.join("+")}
        </Chip>
      ) : null}
      {token.runtimeOnly ? (
        <Chip tone="neutral" title="value contains var() — resolves in the browser">
          runtime var()
        </Chip>
      ) : null}
    </span>
  );
}

export function ColorTableHead() {
  return (
    <thead>
      <tr>
        <Th className="w-[12.5rem]">Token</Th>
        <Th className="w-[9rem]">Value</Th>
        <Th className="w-[13rem]">OKLCH</Th>
        <Th>Measured contrast</Th>
        <Th className="w-[16rem]">Source</Th>
      </tr>
    </thead>
  );
}

export function ColorRow({ entry, index }: { entry: MeasuredColor; index: number }) {
  const { token } = entry;
  return (
    <Tr index={index}>
      <Td>
        <span className="flex items-center gap-3">
          <Swatch hex={entry.hex} size="sm" />
          <span className="min-w-0">
            <VarName name={token.cssVar} />
            <span className="block text-[11px] text-muted-foreground">
              {entry.role === "unknown" ? TIER_LABEL[token.tier] : entry.role}
            </span>
          </span>
        </span>
      </Td>
      <Td>
        <Mono>{token.resolved}</Mono>
        {entry.alpha < 1 ? (
          <span
            className="block text-[11px] text-muted-foreground"
            title="composited over the page background before measuring"
          >
            α {entry.alpha} · over --background
          </span>
        ) : null}
      </Td>
      <Td>
        <OklchCell entry={entry} />
      </Td>
      <Td>
        <PairingList entry={entry} />
      </Td>
      <Td>
        <Provenance token={token} />
      </Td>
    </Tr>
  );
}

/** Description straight out of the source, or a note that there is none. */
export function DescriptionRow({ entry, index }: { entry: MeasuredColor; index: number }) {
  if (!entry.token.slotDescription) return null;
  return (
    <tr className={index % 2 === 1 ? "bg-muted/35" : undefined}>
      <td colSpan={5} className="pb-3 pl-3">
        <p className="max-w-4xl text-[12px] text-muted-foreground leading-relaxed">
          {entry.token.slotDescriptionBorrowed ? (
            <span
              className="mr-1.5 font-mono text-[11px] uppercase"
              title="this mode's declaration carries no description; the slot is documented in the other mode"
            >
              slot:
            </span>
          ) : null}
          {entry.token.slotDescription}
        </p>
      </td>
    </tr>
  );
}

/** A non-colour token: value, how to use it, provenance. */
export function SimpleRow({ item, index }: { item: SimpleToken; index: number }) {
  return (
    <Tr index={index}>
      <Td className="w-[14rem]">
        <VarName name={item.token.cssVar} />
      </Td>
      <Td className="w-[16rem]">
        <Mono>{item.token.resolved}</Mono>
      </Td>
      <Td className="w-[13rem]">
        {item.use.utility ? (
          <Mono>{item.use.utility}</Mono>
        ) : (
          <span className="flex flex-col gap-0.5">
            <Mono>{item.use.fallback}</Mono>
            <span
              className="text-[11px] text-muted-foreground"
              title={`no utility: ${item.use.requires} is not declared in an @theme block`}
            >
              no Tailwind utility
            </span>
          </span>
        )}
      </Td>
      <Td>
        <span className="flex flex-col gap-1">
          <Provenance token={item.token} />
          {item.token.slotDescription ? (
            <span className="max-w-2xl text-[12px] text-muted-foreground leading-relaxed">
              {item.token.slotDescription}
            </span>
          ) : null}
        </span>
      </Td>
    </Tr>
  );
}

export function SimpleTableHead({ valueLabel = "Value" }: { valueLabel?: string }) {
  return (
    <thead>
      <tr>
        <Th>Token</Th>
        <Th>{valueLabel}</Th>
        <Th>Use</Th>
        <Th>Source</Th>
      </tr>
    </thead>
  );
}
