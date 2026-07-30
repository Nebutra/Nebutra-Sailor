import type { Metadata } from "next";
import {
  aliases,
  belowReference,
  compatTier,
  failures,
  formatRatio,
  type MeasuredColor,
  MODES,
  type Mode,
  palettes,
  scales,
  semanticRoles,
} from "@/lib/tokens";
import {
  BothModes,
  Chip,
  Mono,
  Note,
  PageHeader,
  Panel,
  Section,
  Table,
} from "../_components/primitives";
import {
  ColorRow,
  ColorTableHead,
  DescriptionRow,
  OklchCell,
  Swatch,
} from "../_components/token-rows";

export const metadata: Metadata = {
  title: "Colour — tokens",
  description:
    "Every colour token in the DTCG source, with its resolved value, computed OKLCH, and measured contrast against the backdrops the source pairs it with.",
};

/** A scale rendered as twelve stacked swatches with their step numbers. */
function ScaleStrip({ steps }: { steps: MeasuredColor[] }) {
  return (
    <div className="flex gap-1">
      {steps.map((step) => (
        <div key={step.token.cssVar} className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div
            className="h-16 rounded-md"
            style={{ backgroundColor: step.hex ?? undefined }}
            title={`--${step.token.cssVar} = ${step.token.resolved}`}
          />
          <span className="text-center font-mono text-[10px] text-muted-foreground tabular-nums">
            {step.token.name.split(".").at(-1)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ScaleTable({ steps }: { steps: MeasuredColor[] }) {
  return (
    <Table>
      <ColorTableHead />
      <tbody>
        {steps.flatMap((step, index) => [
          <ColorRow key={step.token.cssVar} entry={step} index={index} />,
          <DescriptionRow key={`${step.token.cssVar}-note`} entry={step} index={index} />,
        ])}
      </tbody>
    </Table>
  );
}

function FindingsPanel({ mode }: { mode: Mode }) {
  const everything = [
    ...semanticRoles(mode),
    ...scales(mode).flatMap((scale) => scale.steps),
    ...aliases(mode),
  ];
  const required = failures(everything);
  const reference = belowReference(everything);

  return (
    <Panel tone="muted">
      <h3 className="mb-3 font-medium font-mono text-[11px] uppercase tracking-widest">
        {mode} · measured findings
      </h3>

      {required.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          Every pairing the source declares clears its required bar.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {required.map(({ entry, pairing }) => (
            <li
              key={`${entry.token.cssVar}-${pairing.backdrop.cssVar}`}
              className="flex flex-wrap items-center gap-2 text-[13px]"
            >
              <Swatch hex={entry.hex} size="sm" />
              <Mono>--{entry.token.cssVar}</Mono>
              <span className="text-muted-foreground">on</span>
              <Mono>--{pairing.backdrop.cssVar}</Mono>
              <Chip tone="fail">
                {formatRatio(pairing.verdict.ratio)} · below {pairing.verdict.required}:1
              </Chip>
              {pairing.verdict.passesLarge ? (
                <Chip tone="warn">clears 3:1 large-text</Chip>
              ) : (
                <Chip tone="fail">also below 3:1</Chip>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-[12px] text-muted-foreground leading-relaxed">
        {reference.length} further pairing{reference.length === 1 ? "" : "s"} sit below the 3:1
        reference line for boundaries. Those are reported on the rows rather than here: WCAG 1.4.11
        governs a boundary only where it is the sole means of identifying a component, so a token
        the source calls a <em>subtle border</em> is doing its job below that line.
      </p>
    </Panel>
  );
}

export default function ColorTokensPage() {
  const lightScales = scales("light");
  const lightPalettes = palettes("light");

  return (
    <div>
      <PageHeader eyebrow="tokens / colour" title="Colour">
        <p>
          Every row below is read from <Mono>packages/design/design-tokens/tokens/**</Mono> at build
          time. The value is resolved the way the token build resolves it — aliases followed, and
          the border tier computed by the same <Mono>derive-border-tier.mjs</Mono> the build calls.
          The OKLCH figures and every contrast ratio are calculated here, from that value. None of
          it is transcribed, so none of it can drift.
        </p>
        <p>
          Contrast is measured against the backdrops the source actually pairs a token with — a
          declared <Mono>--x</Mono>/<Mono>--x-foreground</Mono> pair, or a step of the token's own
          scale. Where the source declares no backdrop, the row says so instead of inventing one.
        </p>
      </PageHeader>

      <Section title="Findings">
        <div className="grid gap-4 lg:grid-cols-2">
          {MODES.map((mode) => (
            <FindingsPanel key={mode} mode={mode} />
          ))}
        </div>
      </Section>

      <Section
        title="The 12-step functional scales"
        note={
          <>
            <p>
              These are the scales product code reaches for. Steps 1–5 are surfaces, 6–8 are the
              border tier, 9–10 are solid fills, 11–12 are text — the tiering asserted by the ladder
              invariant in <Mono>derive-border-tier.mjs</Mono>.
            </p>
            <p>
              Steps 6, 7 and 8 carry a <strong>computed</strong> chip. They are not written in the
              source at all: the source stores a placeholder and the build replaces it with an OKLab
              interpolation from step 5 toward the tier anchor, at t = 0.25 / 0.50 / 0.75. That is
              why the same three steps read differently on the cyan scale — a bright accent's step 9
              sits barely below step 5, so the anchor falls through to step 10 instead.
            </p>
          </>
        }
      >
        <div className="space-y-12">
          {lightScales.map((scale) => (
            <div key={scale.name}>
              <h3 className="mb-4 font-medium text-[15px] text-foreground">{scale.name}</h3>
              <BothModes
                render={(mode) => {
                  const steps =
                    scales(mode).find((entry) => entry.name === scale.name)?.steps ?? [];
                  return <ScaleStrip steps={steps} />;
                }}
              />
              <div className="mt-6">
                <ScaleTable steps={scale.steps} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Semantic roles"
        note={
          <>
            <p>
              These are the tokens components consume. Their values are{" "}
              <strong>bare HSL channel triples</strong>, not colours — which is the single most
              expensive mistake available in this codebase, and has{" "}
              <a className="underline decoration-dotted underline-offset-2" href="/tokens/traps">
                its own page
              </a>
              .
            </p>
            <p>
              The swatches and the numbers here are computed by parsing those channels, so what you
              see is what <Mono>hsl(var(--x))</Mono> resolves to.
            </p>
          </>
        }
      >
        <Table>
          <ColorTableHead />
          <tbody>
            {semanticRoles("light").flatMap((entry, index) => [
              <ColorRow key={entry.token.cssVar} entry={entry} index={index} />,
              <DescriptionRow key={`${entry.token.cssVar}-note`} entry={entry} index={index} />,
            ])}
          </tbody>
        </Table>
        <div className="mt-4">
          <Note>
            Dark mode re-declares all of these with independently chosen values. The dark table is
            below rather than beside, because the rows are long — but the findings panel at the top
            of this page covers both modes at once.
          </Note>
        </div>
        <div className="dark mt-4 rounded-panel bg-background p-5 text-foreground shadow-ambient-sm">
          <p className="mb-4 font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
            dark <span className="ml-2 normal-case tracking-normal">.dark</span>
          </p>
          <Table>
            <ColorTableHead />
            <tbody>
              {semanticRoles("dark").map((entry, index) => (
                <ColorRow key={entry.token.cssVar} entry={entry} index={index} />
              ))}
            </tbody>
          </Table>
        </div>
      </Section>

      <Section
        title="Brand and status aliases"
        note={
          <p>
            Aliases over the primitives. <Mono>--brand-primary</Mono> is the VI identity lock and is
            lint-banned from component surfaces; <Mono>--primary</Mono> is the action fill. Their
            values below are different colours, and the alias column shows which primitive each
            points at.
          </p>
        }
      >
        <Table>
          <ColorTableHead />
          <tbody>
            {aliases("light").flatMap((entry, index) => [
              <ColorRow key={entry.token.cssVar} entry={entry} index={index} />,
              <DescriptionRow key={`${entry.token.cssVar}-note`} entry={entry} index={index} />,
            ])}
          </tbody>
        </Table>
      </Section>

      <Section
        title="Primitive palettes"
        note={
          <p>
            The 11-stop ramps the functional scales alias into. Product code should not reach for
            these directly — a scale step is the addressable unit — but they are what a rebrand
            replaces, so they are shown with the same measurements.
          </p>
        }
      >
        <div className="space-y-8">
          {lightPalettes.map((palette) => (
            <div key={palette.name}>
              <div className="mb-3 flex items-baseline gap-3">
                <h3 className="font-medium text-[15px] text-foreground">{palette.name}</h3>
                <span className="text-[12px] text-muted-foreground">
                  {palette.steps.length} stops
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {palette.steps.map((step) => (
                  <div key={step.token.name} className="w-[8.5rem]">
                    <Swatch hex={step.hex} size="lg" />
                    <div className="mt-2">
                      <Mono>{step.token.name.split(".").at(-1)}</Mono>
                      <div className="text-[11px] text-muted-foreground">
                        <Mono>{step.token.resolved}</Mono>
                      </div>
                      <div className="mt-0.5 text-[10.5px]">
                        <OklchCell entry={step} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Geist-compat tier"
        note={
          <p>
            The <Mono>--ds-*</Mono> tokens exist so components ported from Vercel's Geist keep
            working. They are stored in <Mono>oklch()</Mono> and <Mono>hsla()</Mono> rather than as
            channel triples, which is why the notation column is worth reading before copying a
            value out of this table.
          </p>
        }
      >
        <Table>
          <ColorTableHead />
          <tbody>
            {compatTier("light").map((entry, index) => (
              <ColorRow key={entry.token.cssVar} entry={entry} index={index} />
            ))}
          </tbody>
        </Table>
      </Section>
    </div>
  );
}
