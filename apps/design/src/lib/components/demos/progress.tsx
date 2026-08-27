"use client";

import { Progress } from "@nebutra/ui/primitives";
import * as React from "react";
import {
  Aside,
  AxisMatrix,
  ControlButton,
  Controls,
  DemoPage,
  Row,
  Specimen,
  Stack,
  State,
} from "../demo-kit";
import type { DemoProps } from "../derived";
import { axis, axisDefault } from "../derived";

export default function ProgressDemo({ derived }: DemoProps) {
  const variants = axis(derived, "progress", "variant");
  const sizes = axis(derived, "progress", "size");

  const [value, setValue] = React.useState(38);
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setValue((v) => (v >= 100 ? 0 : v + 3));
    }, 240);
    return () => window.clearInterval(id);
  }, [running]);

  return (
    <DemoPage>
      <State
        breaks="A variant whose fill has too little contrast against the track. Track and fill are separate tokens and can drift apart independently."
        id="variants"
        note={`All ${variants.length} variants declared in progressVariants, at 62%.`}
        title="Every variant"
      >
        <AxisMatrix
          axisName="variant"
          className="flex-col"
          defaultValue={axisDefault(derived, "progress", "variant")}
          render={(variant) => (
            <div className="w-72">
              <Progress value={62} variant={variant as never} />
            </div>
          )}
          values={variants}
        />
      </State>

      <State
        breaks="A size where the radius no longer matches the height, so the bar reads as a rectangle at sm and a pill at lg."
        id="sizes"
        title="Sizes"
      >
        <AxisMatrix
          axisName="size"
          className="flex-col"
          defaultValue={axisDefault(derived, "progress", "size")}
          render={(size) => (
            <div className="w-72">
              <Progress size={size as never} value={62} />
            </div>
          )}
          values={sizes}
        />
      </State>

      <State
        breaks="A determinate bar that jumps rather than animates, and an indeterminate bar that silently renders as 0% — the two are one prop apart and look nothing alike."
        id="determinate"
        note="value=null (or omitted) is indeterminate. Start the animation and watch the fill transition rather than snap."
        title="Determinate, indeterminate, complete"
      >
        <Controls>
          <ControlButton active={running} onClick={() => setRunning((v) => !v)}>
            animate
          </ControlButton>
          <ControlButton onClick={() => setValue(0)}>0%</ControlButton>
          <ControlButton onClick={() => setValue(38)}>38%</ControlButton>
          <ControlButton onClick={() => setValue(100)}>100%</ControlButton>
        </Controls>
        <Stack>
          <div className="w-full max-w-md">
            <Progress label="Uploading" showValue value={value} />
          </div>
          <Row align="start">
            <Specimen label="value={null} — indeterminate">
              <div className="w-56">
                <Progress value={null} />
              </div>
            </Specimen>
            <Specimen label="value={0} — empty">
              <div className="w-56">
                <Progress value={0} />
              </div>
            </Specimen>
            <Specimen label="value={100} — complete">
              <div className="w-56">
                <Progress value={100} variant="success" />
              </div>
            </Specimen>
          </Row>
        </Stack>
      </State>

      <State
        breaks="A threshold map whose colour flips at the wrong percentage, and the bare-var trap: these values land in a backgroundColor slot, so a semantic token has to be wrapped in hsl(...) or the declaration is discarded and the bar falls back to its variant fill."
        id="thresholds"
        note="colors maps a percentage to a CSS colour — not to a variant name. The highest key at or below the current value wins."
        title="Threshold colours"
      >
        <Stack>
          {[30, 65, 92].map((pct) => (
            <div className="w-full max-w-md" key={pct}>
              <Progress
                colors={{
                  0: "hsl(var(--success))",
                  60: "hsl(var(--warning))",
                  90: "hsl(var(--destructive))",
                }}
                label={`Quota — ${pct}%`}
                showValue
                value={pct}
              />
            </div>
          ))}
        </Stack>
      </State>

      <State
        breaks="Stop markers drifting off their percentage as the bar resizes, or overlapping each other at close values."
        id="stops"
        note="stops places markers at given percentages. Two of these are deliberately close together."
        title="Stage markers"
      >
        <div className="w-full max-w-md">
          <Progress
            label="Build stages"
            stops={[
              { value: 20, ariaLabel: "Install" },
              { value: 45, ariaLabel: "Compile" },
              { value: 50, ariaLabel: "Bundle" },
              { value: 85, ariaLabel: "Deploy" },
            ]}
            value={value}
          />
        </div>
      </State>

      <State
        breaks="A max other than 100 being treated as a percentage — the classic off-by-a-scale bug. Both bars below are at the same real fraction."
        id="max"
        note="max sets the real ceiling. value is in max units, not percent."
        title="Non-percentage scale"
      >
        <Row align="start">
          <Specimen label="value={7} max={10}">
            <div className="w-56">
              <Progress max={10} showValue value={7} />
            </div>
          </Specimen>
          <Specimen label="value={70} max={100}">
            <div className="w-56">
              <Progress showValue value={70} />
            </div>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A long label wrapping into the bar, or a value readout that clips at narrow widths."
        id="overflow"
        title="Overflow — long label"
      >
        <div className="max-w-[16rem] rounded-lg bg-background p-3">
          <Progress
            label="Provisioning a dedicated single-tenant analytics cluster in Frankfurt"
            showValue
            value={44}
          />
        </div>
      </State>

      <Aside title="There is no keyboard path">
        <p>
          Progress is not focusable and has no keyboard contract — it is a status output. Its
          accessibility surface is <code>aria-valuenow</code>, which the component throttles to
          about 1Hz so a fast-moving bar does not flood a screen reader. Turn on the animation above
          and the announcement rate stays sane while the fill does not.
        </p>
      </Aside>
    </DemoPage>
  );
}
