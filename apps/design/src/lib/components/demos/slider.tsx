"use client";

import { Slider } from "@nebutra/ui/primitives";
import * as React from "react";
import { DemoPage, KeyboardPath, Row, Specimen, Stack, State } from "../demo-kit";

export default function SliderDemo() {
  const [single, setSingle] = React.useState<number[]>([48]);
  const [range, setRange] = React.useState<number[]>([20, 70]);

  return (
    <DemoPage>
      <State
        breaks="A slider with no visible value. A slider without a readout forces the user to guess what they picked."
        id="default"
        note="Label, unit and value readout come from the component."
        title="Default"
      >
        <div className="max-w-sm">
          <Slider
            label="Sample rate"
            max={96}
            min={8}
            onValueChange={setSingle}
            step={4}
            unit=" kHz"
            value={single}
          />
        </div>
      </State>

      <State
        breaks="A two-thumb slider whose thumbs can cross, or where dragging one silently moves the other."
        id="range"
        note="Two values make it a range. Drag the thumbs together and they must not swap."
        title="Range"
      >
        <div className="max-w-sm">
          <Slider
            label="Price band"
            max={100}
            min={0}
            onValueChange={setRange}
            unit="%"
            value={range}
          />
        </div>
      </State>

      <State
        breaks="A slider pinned at either end where the thumb hangs outside the track."
        id="bounds"
        note="At the minimum, at the maximum, and with a coarse step."
        title="Bounds and step"
      >
        <Stack>
          <Row align="start">
            <Specimen label="at min">
              <div className="w-48">
                <Slider defaultValue={[0]} max={100} min={0} showValue />
              </div>
            </Specimen>
            <Specimen label="at max">
              <div className="w-48">
                <Slider defaultValue={[100]} max={100} min={0} showValue />
              </div>
            </Specimen>
          </Row>
          <div className="max-w-sm">
            <Slider
              defaultValue={[50]}
              label="Instances (step 25)"
              max={100}
              min={0}
              showValue
              step={25}
            />
          </div>
        </Stack>
      </State>

      <State
        breaks="A disabled slider that still responds to drag, or one whose track keeps its filled colour at full strength."
        id="disabled"
        title="Disabled"
      >
        <div className="max-w-sm">
          <Slider defaultValue={[35]} disabled label="Sample rate" max={96} min={8} unit=" kHz" />
        </div>
      </State>

      <State
        breaks="A formatted value that overflows its slot, or a long label that collides with the readout at narrow widths."
        id="overflow"
        note="Long label plus a formatted value, constrained."
        title="Overflow"
      >
        <div className="max-w-[15rem] rounded-lg bg-background p-3">
          <Slider
            defaultValue={[7300]}
            formatValue={(v) => `${v.toLocaleString()} requests / minute`}
            label="Rate limit for the shared ingest endpoint"
            max={10000}
            min={0}
            showValue
            step={100}
          />
        </div>
      </State>

      <State
        breaks="A slider that only moves by drag. Every value must be reachable from the keyboard, and Home/End must jump to the bounds."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab", does: "focuses the thumb. A range slider has one tab stop per thumb." },
            { keys: "← →", does: "moves by one step." },
            { keys: "PageUp / PageDown", does: "moves by a larger increment." },
            { keys: "Home / End", does: "jumps to the minimum and maximum." },
          ]}
        >
          <div className="max-w-sm">
            <Slider
              label="Sample rate"
              max={96}
              min={8}
              onValueChange={setSingle}
              step={4}
              unit=" kHz"
              value={single}
            />
          </div>
        </KeyboardPath>
      </State>
    </DemoPage>
  );
}
