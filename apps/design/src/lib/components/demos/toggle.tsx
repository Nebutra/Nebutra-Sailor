"use client";

import { Toggle } from "@nebutra/ui/primitives";
import * as React from "react";
import { AxisMatrix, DemoPage, KeyboardPath, LONG_LABEL, Row, Specimen, State } from "../demo-kit";
import type { DemoProps } from "../derived";

function Controlled({
  initial = false,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Toggle>, "checked" | "onChange"> & { initial?: boolean }) {
  const [checked, setChecked] = React.useState(initial);
  return (
    <Toggle {...props} checked={checked} onChange={setChecked}>
      {children}
    </Toggle>
  );
}

export default function ToggleDemo({ derived }: DemoProps) {
  const sizes = derived.axes.size ?? [];
  const colors = derived.axes.color ?? [];

  return (
    <DemoPage>
      <State
        breaks="An uncontrolled toggle. This component is controlled-only: without checked and onChange it will not move."
        id="default"
        note="Off and on. Both need checked + onChange from the caller."
        title="Default"
      >
        <Row className="gap-6">
          <Controlled aria-label="Enable firewall" />
          <Controlled aria-label="Enable firewall" initial />
        </Row>
      </State>

      <State
        breaks="A size where the knob no longer fits its track, which reads as a misaligned circle."
        id="sizes"
        note="Sizes come from the toggleSizes const array in tokens/components/toggle.ts."
        title="Sizes"
      >
        <AxisMatrix
          axisName="size"
          defaultValue="normal"
          render={(size) => (
            <Controlled aria-label={`Toggle ${size}`} initial size={size as never} />
          )}
          values={sizes}
        />
      </State>

      <State
        breaks="A colour whose on-state fill is the VI identity blue. --blue-9 / --brand-primary is banned on component surfaces; the action fill is --primary."
        id="colors"
        note={`All ${colors.length} colours from the toggleColors const array, shown on.`}
        title="Every colour"
      >
        <AxisMatrix
          axisName="color"
          defaultValue="default"
          render={(color) => (
            <Controlled aria-label={`Toggle ${color}`} color={color as never} initial />
          )}
          values={colors}
        />
      </State>

      <State
        breaks="A label rendered on the wrong side of the control, or one that stops being clickable when the direction flips."
        id="direction"
        note="direction controls which side the label sits on."
        title="Label placement"
      >
        <Row className="gap-8">
          {(["label-first", "switch-first"] as const).map((direction) => (
            <Specimen key={direction} label={direction}>
              <Controlled direction={direction} initial>
                Firewall
              </Controlled>
            </Specimen>
          ))}
        </Row>
      </State>

      <State
        breaks="A disabled toggle in the on state that looks identical to the enabled on state."
        id="disabled"
        title="Disabled"
      >
        <Row className="gap-6">
          <Specimen label="disabled off">
            <Controlled disabled>Firewall</Controlled>
          </Specimen>
          <Specimen label="disabled on">
            <Controlled disabled initial>
              Firewall
            </Controlled>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A long label pushing the control off the row, or wrapping under it and losing the vertical alignment."
        id="overflow"
        title="Overflow — long label"
      >
        <div className="max-w-[18rem] rounded-lg bg-background p-3">
          <Controlled initial>{LONG_LABEL}</Controlled>
        </div>
      </State>

      <State
        breaks="A toggle that only responds to a click. Space must flip it."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab", does: "focuses the toggle." },
            { keys: "Space", does: "flips it." },
            { keys: "Tab", does: "skips the disabled one entirely." },
          ]}
        >
          <Row className="gap-6">
            <Controlled>Analytics</Controlled>
            <Controlled disabled>Audit log (Enterprise)</Controlled>
            <Controlled initial>Notifications</Controlled>
          </Row>
        </KeyboardPath>
      </State>
    </DemoPage>
  );
}
