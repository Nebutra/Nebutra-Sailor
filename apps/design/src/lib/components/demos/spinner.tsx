"use client";

import { Button, Spinner } from "@nebutra/ui/primitives";
import { Aside, AxisMatrix, DemoPage, Row, Specimen, State } from "../demo-kit";
import type { DemoProps } from "../derived";

export default function SpinnerDemo({ derived }: DemoProps) {
  const sizes = derived.axes.size ?? [];
  const tones = derived.axes.tone ?? [];
  const variants = derived.axes.variant ?? [];

  return (
    <DemoPage>
      <State
        breaks="A spinner announced twice — once by itself and once by the aria-busy region containing it. label announces; decorative silences."
        id="default"
        note="With a label it is a status; without one, or with decorative, it is silent."
        title="Default"
      >
        <Row className="gap-8">
          <Specimen label='label="Loading"'>
            <Spinner label="Loading" />
          </Specimen>
          <Specimen label="decorative">
            <Spinner decorative />
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A spinner whose stroke width does not scale with its size, so the small one reads as a smudge."
        id="sizes"
        note="Size tokens come from spinnerSizes in tokens/components/spinner.ts. A number is also accepted."
        title="Sizes"
      >
        <AxisMatrix
          axisName="size"
          defaultValue="md"
          render={(size) => <Spinner decorative size={size as never} />}
          values={sizes}
        />
      </State>

      <State
        breaks="A spinner that disappears on the surface it is placed on. The inverse tone exists for solid fills; check it against the dark pane too."
        id="tones"
        note="Tones come from spinnerTones. inverse is shown on a solid fill, which is the only place it works."
        title="Tones"
      >
        <Row className="gap-8">
          {tones.map((tone) => (
            <Specimen key={tone} label={tone}>
              {tone === "inverse" ? (
                <div className="rounded-md bg-primary p-3">
                  <Spinner decorative tone={tone as never} />
                </div>
              ) : (
                <div className="p-3">
                  <Spinner decorative tone={tone as never} />
                </div>
              )}
            </Specimen>
          ))}
        </Row>
      </State>

      <State
        breaks="Reading the variant prop as a set of real options. It is deprecated and inert — every value below renders the same spinner. This state exists so nobody spends time choosing between them."
        id="variants"
        note={`All ${variants.length} accepted variant values. They are source-compatibility only.`}
        title="The deprecated variant prop"
      >
        <AxisMatrix
          axisName="variant"
          render={(variant) => <Spinner decorative size="md" variant={variant as never} />}
          values={variants}
        />
      </State>

      <State
        breaks="A spinner sitting next to a label at a different optical centre, or one that changes the height of the row it appears in."
        id="in-context"
        note="Inline with text, inside a button, and centred in a panel — the three places it actually appears."
        title="In context"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-2 rounded-lg bg-background p-4 text-muted-foreground text-sm">
            <Spinner decorative size="sm" />
            Checking availability…
          </div>
          <div className="rounded-lg bg-background p-4">
            <Button loading>Deploying</Button>
          </div>
          <div
            aria-busy="true"
            className="flex min-h-20 items-center justify-center rounded-lg bg-background p-4"
          >
            <Spinner label="Loading deployments" />
          </div>
        </div>
      </State>

      <Aside title="No empty, error or keyboard state">
        <p>
          A spinner has one state: spinning. It is not focusable, cannot be empty, and cannot fail —
          the failure belongs to the region around it, which should replace the spinner with{" "}
          <code>ErrorState</code> rather than keep spinning. A spinner that never stops is the
          defect this component cannot show you; only the caller can.
        </p>
      </Aside>
    </DemoPage>
  );
}
