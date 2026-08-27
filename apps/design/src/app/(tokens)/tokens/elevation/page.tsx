import type { Metadata } from "next";
import { type ElevationStep, effects, elevationRamp, type Mode } from "@/lib/tokens";
import { BothModes, Chip, Mono, Note, PageHeader, Section, Table } from "../_components/primitives";
import { SimpleRow, SimpleTableHead } from "../_components/token-rows";

export const metadata: Metadata = {
  title: "Elevation — tokens",
  description:
    "The shadow ramp rendered on real surfaces in both modes, because the dark values are chosen independently rather than mirrored.",
};

/**
 * A card carrying one step of the ramp.
 *
 * The shadow is applied as an inline `boxShadow` from the token's own resolved
 * value rather than through the `shadow-*` utility. That is deliberate on THIS
 * page: painting from the value proves the value, and a utility that had silently
 * stopped resolving would still look plausible. The utility name is printed
 * beside it, and it is what product code should use.
 */
function ElevationCard({ step }: { step: ElevationStep }) {
  return (
    <div className="min-w-0">
      <div
        className="flex h-24 items-end rounded-panel bg-card p-3"
        style={{ boxShadow: step.token.resolved }}
      >
        <span className="truncate font-mono text-[11px] text-muted-foreground">
          {step.use.utility ?? `var(--${step.token.cssVar})`}
        </span>
      </div>
    </div>
  );
}

function Ramp({ mode }: { mode: Mode }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {elevationRamp(mode).map((step) => (
        <ElevationCard key={step.token.cssVar} step={step} />
      ))}
    </div>
  );
}

export default function ElevationTokensPage() {
  const light = elevationRamp("light");
  const differing = light.filter((step) => step.otherMode !== null);

  return (
    <div>
      <PageHeader eyebrow="tokens / elevation" title="Elevation">
        <p>
          The ramp is rendered on real surfaces in both modes, side by side, because a table cannot
          show it. {differing.length} of {light.length} steps have a{" "}
          <strong>different value in dark mode</strong> — not a scaled version of the light one, a
          separately chosen one. Dark shadows carry more opacity because a shadow on a dark surface
          has less luminance range to work with, and some steps swap a black wash for a white inset.
        </p>
        <p>
          Reach for a step. Do not write <Mono>shadow-[0_2px_8px_rgba(0,0,0,0.1)]</Mono> — a bespoke
          value is a value that will not follow the theme into dark mode, which is exactly the
          divergence this page exists to make visible.
        </p>
      </PageHeader>

      <Section
        title="The ramp, both modes"
        note={
          <p>
            <strong>xs…2xl</strong> is the tight product ramp — controls, cards, popovers.{" "}
            <strong>ambient-*</strong> pairs a contact shadow with a wide soft pool, for marketing
            surfaces. <strong>glass-*</strong> adds an inset highlight for translucent panels.{" "}
            <strong>sheen</strong> is a top-edge inset for solid inverted fills.{" "}
            <strong>glow-*</strong> carry brand colour, so a glass card never hand-types the accent
            as raw rgba.
          </p>
        }
      >
        <BothModes render={(mode) => <Ramp mode={mode} />} />
      </Section>

      <Section
        title="Steps that change between modes"
        note={
          <p>
            The pairs below are the same token in the two modes. This is the table that a
            single-mode page hides.
          </p>
        }
      >
        <Table>
          <thead>
            <tr>
              <th
                scope="col"
                className="pb-2 pl-3 font-medium text-[11px] text-muted-foreground uppercase tracking-wider"
              >
                Token
              </th>
              <th
                scope="col"
                className="pb-2 pl-3 font-medium text-[11px] text-muted-foreground uppercase tracking-wider"
              >
                Light
              </th>
              <th
                scope="col"
                className="pb-2 pl-3 font-medium text-[11px] text-muted-foreground uppercase tracking-wider"
              >
                Dark
              </th>
            </tr>
          </thead>
          <tbody>
            {light.map((step, index) => (
              <tr key={step.token.cssVar} className={index % 2 === 1 ? "bg-muted/35" : undefined}>
                <td className="py-2.5 pl-3 align-top">
                  <Mono>--{step.token.cssVar}</Mono>
                  <div className="mt-1">
                    {step.otherMode === null ? (
                      <Chip tone="neutral">same in both modes</Chip>
                    ) : (
                      <Chip tone="accent">mode-specific</Chip>
                    )}
                  </div>
                </td>
                <td className="max-w-[22rem] py-2.5 pl-3 align-top">
                  <Mono className="break-words">{step.token.resolved}</Mono>
                </td>
                <td className="max-w-[22rem] py-2.5 pl-3 align-top">
                  <Mono className="break-words">{step.otherMode ?? step.token.resolved}</Mono>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section
        title="Related effect tokens"
        note={
          <p>
            Not shadows, but part of the same surface vocabulary: an inset hairline ring and a faint
            overlay wash. Both are mode-specific for the same reason the shadows are.
          </p>
        }
      >
        <BothModes
          render={(mode) => (
            <Table>
              <SimpleTableHead />
              <tbody>
                {effects(mode).map((item, index) => (
                  <SimpleRow key={item.token.cssVar} item={item} index={index} />
                ))}
              </tbody>
            </Table>
          )}
        />
      </Section>

      <Note>
        Every step above is generated from the <Mono>elevation</Mono> group of{" "}
        <Mono>tokens/themes/light.json</Mono> and <Mono>tokens/themes/dark.json</Mono>. Add a step
        to both files and it appears here, painted, on the next build.
      </Note>
    </div>
  );
}
