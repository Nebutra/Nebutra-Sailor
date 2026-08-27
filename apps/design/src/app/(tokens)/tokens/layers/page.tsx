import type { Metadata } from "next";
import {
  EDIT_RULE,
  groups,
  MODES,
  pipeline,
  REGISTERED_COUNT,
  TIER_LABEL,
  type Tier,
  tokenSet,
} from "@/lib/tokens";
import { Chip, Mono, Note, PageHeader, Panel, Section, Table } from "../_components/primitives";

export const metadata: Metadata = {
  title: "Layers — tokens",
  description:
    "Which token file is editable and which is generated, decided by reading each file's own header. Plus the primitive / semantic / mode layering and the derived border tier.",
};

const EDITABILITY_TONE = {
  editable: "pass",
  generated: "warn",
  "generated-untracked": "neutral",
} as const;

const EDITABILITY_LABEL = {
  editable: "editable — source",
  generated: "generated — do not edit",
  "generated-untracked": "build output — gitignored",
} as const;

const TIER_ORDER: Tier[] = [
  "primitive-palette",
  "semantic-alias",
  "functional-scale",
  "semantic-role",
  "elevation",
  "compat",
  "foundation",
];

export default function LayersPage() {
  const stages = pipeline();
  const light = tokenSet("light");
  const derived = light.derivations;
  const tiers = groups("light");

  return (
    <div>
      <PageHeader eyebrow="tokens / layers" title="What is source and what is output">
        <p>
          Most token mistakes in this repository have not been wrong values. They have been right
          values written into the wrong file — edited into{" "}
          <Mono>packages/design/tokens/styles.css</Mono>, which is a generated artefact, and
          overwritten by the next build.
        </p>
        <p>
          The table below does not take anyone's word for which file is which. It opens each one and
          quotes the strongest self-declaration in its header. If a file stops being generated, the
          quote changes here without anyone editing this page.
        </p>
      </PageHeader>

      <Section title="The pipeline, file by file">
        <div className="space-y-3">
          {stages.map((stage) => (
            <div key={stage.path} className="rounded-panel bg-card p-4 shadow-ambient-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Mono>{stage.path}</Mono>
                <Chip tone={EDITABILITY_TONE[stage.editability]}>
                  {EDITABILITY_LABEL[stage.editability]}
                </Chip>
                {stage.present ? null : <Chip tone="warn">not in this checkout</Chip>}
              </div>
              <p className="mt-2 max-w-4xl text-[13px] text-muted-foreground leading-relaxed">
                {stage.role}
              </p>
              <p className="mt-2 border-0 text-[12px] text-muted-foreground/80 italic">
                header says: “{stage.evidence}”
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <Note>{EDIT_RULE}</Note>
        </div>
      </Section>

      <Section
        title="Three layers, two modes"
        note={
          <p>
            Each mode is built from three files, merged in order, with the later declaration
            winning. Both modes contain the same number of tokens because they declare the same
            slots — only the values differ.
          </p>
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              layer: "1 · primitive",
              file: "tokens/core.json",
              body: "Raw material. The 11-stop brand ramps, the radius ladder, the four motion rails, the font stacks. What a rebrand replaces.",
            },
            {
              layer: "2 · semantic",
              file: "tokens/semantic.json",
              body: "Names for jobs, pointing at layer 1. brand.primary, status.*, container widths, the focus ring. Mode-agnostic.",
            },
            {
              layer: "3 · mode",
              file: "tokens/themes/{light,dark}.json",
              body: "The values that actually ship: the 12-step scales, the shadcn semantic roles, the elevation ramp. Declared independently per mode.",
            },
          ].map((entry) => (
            <Panel key={entry.layer}>
              <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
                {entry.layer}
              </p>
              <p className="mt-2">
                <Mono>{entry.file}</Mono>
              </p>
              <p className="mt-3 text-[13px] text-muted-foreground leading-relaxed">{entry.body}</p>
            </Panel>
          ))}
        </div>

        <div className="mt-6">
          <Table>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="pb-2 pl-3 font-medium text-[11px] text-muted-foreground uppercase tracking-wider"
                >
                  DTCG group
                </th>
                <th
                  scope="col"
                  className="pb-2 pl-3 font-medium text-[11px] text-muted-foreground uppercase tracking-wider"
                >
                  Tier
                </th>
                <th
                  scope="col"
                  className="pb-2 pl-3 font-medium text-[11px] text-muted-foreground uppercase tracking-wider"
                >
                  Tokens
                </th>
              </tr>
            </thead>
            <tbody>
              {[...tiers]
                .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))
                .map((entry, index) => (
                  <tr key={entry.name} className={index % 2 === 1 ? "bg-muted/35" : undefined}>
                    <td className="py-2.5 pl-3">
                      <Mono>{entry.name}</Mono>
                    </td>
                    <td className="py-2.5 pl-3 text-[13px] text-muted-foreground">
                      {TIER_LABEL[entry.tier]}
                    </td>
                    <td className="py-2.5 pl-3 font-mono text-[13px] tabular-nums">
                      {entry.count}
                    </td>
                  </tr>
                ))}
            </tbody>
          </Table>
        </div>
      </Section>

      <Section
        title="Tokens nobody wrote"
        note={
          <>
            <p>
              Nine values per mode are not in the source at all. Scale steps 6, 7 and 8 — the border
              tier — are <strong>computed at build time</strong>: the source stores a placeholder,
              and the preprocessor replaces it with an OKLab interpolation from step 5 toward a tier
              anchor at t = 0.25 / 0.50 / 0.75. Equal quarters means every adjacent pair is
              separated by the same ΔL, so the tier cannot collapse into the background tier it sits
              on.
            </p>
            <p>
              The anchor is step 9 when the scale genuinely descends into it, and step 10 when it
              does not. That second case is the <em>bright-scale fallback</em>, and it is why cyan's
              border tier reads differently: a luminous accent's step 9 sits barely below step 5,
              leaving no room for three separated steps between them.
            </p>
          </>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {MODES.map((mode) => (
            <Panel key={mode} tone="muted">
              <p className="mb-3 font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
                {mode}
              </p>
              <ul className="space-y-2">
                {tokenSet(mode).derivations.map((entry) => (
                  <li key={entry.name} className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span
                      className="h-4 w-4 shrink-0 rounded-sm"
                      style={{ backgroundColor: entry.hex }}
                    />
                    <Mono>--{entry.name}</Mono>
                    <Mono>{entry.hex}</Mono>
                    <span className="text-[12px] text-muted-foreground">
                      t = {entry.t} toward step {entry.anchorStep}
                    </span>
                    {entry.bright ? <Chip tone="accent">bright-scale fallback</Chip> : null}
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
        <div className="mt-5">
          <Note>
            These {derived.length} values were produced by importing{" "}
            <Mono>derive-border-tier.mjs</Mono> and calling it — the same module, the same call,
            that the token build makes. This page is not describing the derivation; it is running
            it.
          </Note>
        </div>
      </Section>

      <Section
        title="A variable is not a utility"
        note={
          <p>
            A custom property in <Mono>:root</Mono> does not create a Tailwind class. Only the ones
            re-declared inside an <Mono>@theme</Mono> block do — <Mono>--radius-lg</Mono> there is
            what makes <Mono>rounded-lg</Mono> exist. {REGISTERED_COUNT} variables are registered
            today. Every token page checks each token against that set before claiming a utility for
            it, and prints the working <Mono>var()</Mono> form when there is none.
          </p>
        }
      >
        <Note>
          This matters more than it sounds. A class that is not registered is not an error —
          Tailwind emits nothing and the element simply has no rounding, no shadow, no colour. It is
          trap 1 from the other direction, and it is the reason the "Use" column on these pages is
          derived from the stylesheet rather than from the token's name.
        </Note>
      </Section>
    </div>
  );
}
