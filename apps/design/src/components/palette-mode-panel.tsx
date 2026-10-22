"use client";
// @primitive-exempt: each swatch is a bare hit target painted in the generated colour; Button would paint it in the active theme.

import * as React from "react";
import { evaluatePairs, formatOklch, type PairResult, STEP_ROLES, type Step } from "@/lib/color";
import { useCopy } from "@/lib/use-copy";
import { Chip } from "../app/(tokens)/tokens/_components/primitives";

/**
 * One mode of the generated ladder: the twelve steps, then every pairing the
 * ladder is meant to support, measured two ways. A pairing that misses its bar
 * says so in red; the generator does not bend the ladder to hide it.
 */

/** Which steps each band of the ladder spans, for the header above the swatches. */
const BANDS = [
  { label: "Backgrounds", range: "1–2", span: "col-span-2" },
  { label: "Components", range: "3–5", span: "col-span-3" },
  { label: "Borders", range: "6–8", span: "col-span-3" },
  { label: "Solid", range: "9–10", span: "col-span-2" },
  { label: "Text", range: "11–12", span: "col-span-2" },
] as const;

function Swatches({ steps }: { steps: readonly Step[] }) {
  const { copied, copy } = useCopy();
  const [liveMessage, setLiveMessage] = React.useState("");

  return (
    <div>
      <div className="mb-2 hidden grid-cols-12 gap-px md:grid">
        {BANDS.map((band) => (
          <p
            className={`${band.span} m-0 flex items-baseline gap-1.5 border-border border-t pt-2 text-muted-foreground text-xs`}
            key={band.label}
          >
            <span className="text-foreground tabular-nums">{band.range}</span>
            {band.label}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-6 md:grid-cols-12">
        {steps.map((step) => {
          const role = STEP_ROLES[step.step - 1];
          const value = formatOklch(step.oklch);
          const key = `step-${step.step}`;
          return (
            <button
              aria-label={`Copy step ${step.step}, ${role?.label ?? ""}, ${value}`}
              className="group flex min-w-0 flex-col bg-card text-left outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring"
              key={step.step}
              onClick={() => {
                void copy(value, key);
                setLiveMessage(`Copied step ${step.step}`);
              }}
              title={`${role?.label ?? ""} — click to copy ${value}`}
              type="button"
            >
              <span
                className="block h-16 w-full transition-transform duration-150 group-hover:scale-[1.02] md:h-20"
                // Generated colour: this is the thing being shown.
                style={{ backgroundColor: step.hex }}
              />
              <span className="flex min-w-0 flex-col gap-0.5 px-2 py-2">
                <span className="font-medium text-foreground text-xs tabular-nums">
                  {step.step}
                  {copied === key ? <span className="ml-1 text-success-strong">copied</span> : null}
                </span>
                <span className="truncate font-mono text-muted-foreground text-2xs">
                  {step.hex}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="sr-only">
        {liveMessage}
      </p>
      <p className="m-0 mt-2 text-muted-foreground text-xs md:hidden">
        1–2 backgrounds · 3–5 components · 6–8 borders · 9–10 solid · 11–12 text. Tap a swatch to
        copy its oklch().
      </p>
    </div>
  );
}

function Verdict({ pass, label, bar }: { pass: boolean; label: string; bar: string }) {
  return (
    <Chip
      tone={pass ? "pass" : "fail"}
      title={pass ? `Meets ${bar}` : `Below the ${bar} bar for this pairing`}
    >
      {pass ? "Pass" : "Miss"} · {label}
    </Chip>
  );
}

function PairRow({ pair }: { pair: PairResult }) {
  return (
    <li className="flex flex-col gap-2 border-border border-b py-3 last:border-b-0 sm:grid sm:grid-cols-[minmax(0,1fr)_3.5rem_10rem_10rem] sm:items-center sm:gap-4">
      <div className="min-w-0">
        <p className="m-0 text-foreground text-sm">{pair.label}</p>
        <p className="m-0 font-mono text-muted-foreground text-xs">
          {pair.fgStep === "ink" ? "ink" : `step ${pair.fgStep}`} on step {pair.bgStep}
        </p>
      </div>
      <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-1.5 sm:contents">
        <span
          aria-hidden="true"
          className="row-span-2 flex h-9 w-14 shrink-0 items-center justify-center rounded-md border border-border font-medium text-sm sm:row-span-1"
          style={{ color: pair.fg, backgroundColor: pair.bg }}
        >
          Aa
        </span>
        <span className="flex items-center gap-2">
          <span className="w-14 shrink-0 whitespace-nowrap text-muted-foreground text-xs sm:hidden">
            WCAG 2
          </span>
          <span className="w-12 text-foreground text-sm tabular-nums">
            {pair.wcag.toFixed(2)}
            <span className="text-muted-foreground">:1</span>
          </span>
          <Verdict
            bar={`WCAG 2 ${pair.wcagMin}:1`}
            label={`${pair.wcagMin}`}
            pass={pair.passesWcag}
          />
        </span>
        <span className="flex items-center gap-2">
          <span className="w-14 shrink-0 whitespace-nowrap text-muted-foreground text-xs sm:hidden">
            APCA
          </span>
          <span className="w-12 text-foreground text-sm tabular-nums">
            <span className="text-muted-foreground">Lc </span>
            {Math.abs(pair.apca).toFixed(0)}
          </span>
          <Verdict
            bar={`APCA Lc ${pair.apcaMin}`}
            label={`${pair.apcaMin}`}
            pass={pair.passesApca}
          />
        </span>
      </div>
    </li>
  );
}

export function PaletteModePanel({
  mode,
  steps,
}: {
  mode: "light" | "dark";
  steps: readonly Step[];
}) {
  const pairs = React.useMemo(() => evaluatePairs(steps), [steps]);
  const wcagPassing = pairs.filter((pair) => pair.passesWcag).length;
  const apcaPassing = pairs.filter((pair) => pair.passesApca).length;

  return (
    <div className="flex flex-col gap-8">
      <Swatches steps={steps} />

      <div>
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h3 className="m-0 font-medium text-base text-foreground">
            Contrast, {mode === "light" ? "light" : "dark"}
          </h3>
          <p className="m-0 text-muted-foreground text-xs tabular-nums">
            {wcagPassing} of {pairs.length} pass WCAG 2 · {apcaPassing} of {pairs.length} pass APCA
          </p>
        </div>
        <div
          aria-hidden="true"
          className="hidden grid-cols-[minmax(0,1fr)_3.5rem_10rem_10rem] gap-4 border-border border-b pb-2 text-muted-foreground text-xs sm:grid"
        >
          <span>Pairing</span>
          <span>Sample</span>
          <span>WCAG 2 ratio</span>
          <span>APCA lightness</span>
        </div>
        <ul className="m-0 list-none p-0">
          {pairs.map((pair) => (
            <PairRow key={pair.id} pair={pair} />
          ))}
        </ul>
      </div>
    </div>
  );
}
