import type { Metadata } from "next";
import { aliases, belowReference, failures, scales, semanticRoles } from "@/lib/tokens";
import { Mono, PageHeader, Section } from "../../(tokens)/tokens/_components/primitives";

export const metadata: Metadata = {
  title: "Accessibility — foundations",
  description:
    "The contrast of every declared pairing, measured in both modes at build time, plus the three rules the repo enforces with lint rather than with advice.",
};

/**
 * Accessibility as a measurement, not a pledge.
 *
 * Most design systems put a page here that describes WCAG and promises to
 * respect it. That page is unfalsifiable: it says the same thing whether or not
 * the tokens actually clear the bar, and it keeps saying it after a palette
 * change breaks three pairings.
 *
 * So this one states numbers it computed. Every colour the source declares is
 * paired with the backdrops it is actually used against, the ratio is measured,
 * and the count below is the result — including, when it happens, a failure. A
 * page that cannot report a failure is not reporting anything.
 */

function audit(mode: "light" | "dark") {
  const colours = [
    ...semanticRoles(mode),
    ...scales(mode).flatMap((scale) => scale.steps),
    ...aliases(mode),
  ];
  const pairings = colours.reduce((sum, colour) => sum + colour.pairings.length, 0);
  return {
    colours: colours.length,
    pairings,
    failing: failures(colours),
    soft: belowReference(colours).length,
  };
}

/** Rules the repo enforces mechanically. Each names the check that enforces it. */
const ENFORCED = [
  {
    rule: "One focus ring, globally",
    detail:
      "A single :focus-visible rule in base.css gives every focusable element a 2px translucent outline at 2px offset. Components do not add their own — two rings drawn by two owners is how a focus state ends up 1px off.",
    check: "packages/design/design-tokens/static/base.css",
  },
  {
    rule: "No raw form controls in apps",
    detail:
      "Raw input, textarea and select are banned in apps/**. The primitives carry the label association, the disabled styling and the error contract; a hand-rolled control carries whichever of those its author remembered.",
    check: "scripts/lint-no-raw-inputs.mjs, wired into pnpm lint",
  },
  {
    rule: "Colour is never the only signal",
    detail:
      "StatusDot takes a label, badges carry text, and the deployment states on this site all render their name. A reader who cannot separate the hues gets the same information as one who can.",
    check: "Component review — visible on the StatusDot page",
  },
] as const;

export default function AccessibilityPage() {
  const light = audit("light");
  const dark = audit("dark");
  const totalFailing = light.failing.length + dark.failing.length;

  return (
    <div>
      <PageHeader eyebrow="foundations / accessibility" title="Accessibility">
        <p>
          The numbers below are measured at build time from the token source, not asserted. Every
          colour the source declares is paired with the backdrops it is used against, each ratio is
          computed, and a pairing that falls under its bar is listed by name — including here, on
          this page, where it is inconvenient.
        </p>
      </PageHeader>

      <Section title="Contrast, both modes">
        <div className="grid gap-px overflow-hidden rounded-panel bg-border/40 sm:grid-cols-4">
          {[
            { key: "Colours", value: `${light.colours}`, note: "declared per mode" },
            {
              key: "Pairings",
              value: `${light.pairings + dark.pairings}`,
              note: "measured across both modes",
            },
            {
              key: "Failing",
              value: totalFailing === 0 ? "none" : String(totalFailing),
              note: "normative pairings under their bar",
            },
            {
              key: "Under reference",
              value: String(light.soft + dark.soft),
              note: "non-normative, reported not enforced",
            },
          ].map((cell) => (
            <div className="bg-card px-5 py-4" key={cell.key}>
              <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">
                {cell.key}
              </dt>
              <dd className="mt-2 font-semibold text-2xl text-foreground tabular-nums tracking-tight">
                {cell.value}
              </dd>
              <p className="mt-1 text-[12px] text-muted-foreground leading-snug">{cell.note}</p>
            </div>
          ))}
        </div>

        {totalFailing > 0 ? (
          <ul className="mt-6 flex flex-col gap-2">
            {[...light.failing, ...dark.failing].map(({ entry, pairing }) => (
              <li
                className="rounded-[var(--radius-md)] bg-destructive/10 px-3 py-2 font-mono text-[12px] text-[hsl(var(--destructive-strong))]"
                key={`${entry.token.cssVar}-${pairing.backdrop.cssVar}`}
              >
                --{entry.token.cssVar} on --{pairing.backdrop.cssVar} — {pairing.basis}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 max-w-2xl text-[13px] text-muted-foreground leading-relaxed">
            No normative pairing is under its bar in either mode. The{" "}
            <strong className="font-medium text-foreground">{light.soft + dark.soft}</strong>{" "}
            counted as under reference are pairings where the bar is a line worth knowing about
            rather than a rule — a decorative separator sits outside WCAG 1.4.11, so the number is
            printed without a violation being claimed.
          </p>
        )}
      </Section>

      <Section
        note={
          <p>
            Three rules that hold because something checks them. The distinction matters: a
            guideline nobody runs is a preference, and this repo has retired enough of those to be
            specific about which is which.
          </p>
        }
        title="Enforced, not advised"
      >
        <div className="flex flex-col gap-3">
          {ENFORCED.map((item) => (
            <div
              className="rounded-[var(--radius-lg)] bg-card p-5 shadow-ambient-sm"
              key={item.rule}
            >
              <p className="font-medium text-[15px] text-foreground">{item.rule}</p>
              <p className="mt-2 max-w-3xl text-[13px] text-muted-foreground leading-relaxed">
                {item.detail}
              </p>
              <p className="mt-3">
                <Mono>{item.check}</Mono>
              </p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
