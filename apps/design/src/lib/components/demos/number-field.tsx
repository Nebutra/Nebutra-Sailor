"use client";

import { NumberField } from "@nebutra/ui/primitives";
import * as React from "react";
import {
  Aside,
  AxisMatrix,
  DemoPage,
  KeyboardPath,
  LONG_LABEL,
  Row,
  Specimen,
  Stack,
  State,
} from "../demo-kit";
import type { DemoProps } from "../derived";

/** Holds the value so steppers, typing and clamping have something to change. */
function Live({
  initial,
  readout = false,
  ...props
}: { initial: number | null; readout?: boolean } & Omit<
  React.ComponentProps<typeof NumberField>,
  "value" | "defaultValue" | "onValueChange"
>) {
  const [value, setValue] = React.useState<number | null>(initial);
  return (
    <div className="grid w-60 max-w-full gap-2">
      <NumberField {...props} onValueChange={setValue} value={value} />
      {readout ? (
        <p aria-live="polite" className="text-muted-foreground text-xs">
          Value: {value === null ? "null (empty)" : value}
        </p>
      ) : null}
    </div>
  );
}

export default function NumberFieldDemo({ derived }: DemoProps) {
  const sizes = derived.axes.size?.length ? derived.axes.size : ["sm", "md", "lg"];
  const [text, setText] = React.useState("42");

  return (
    <DemoPage>
      <State
        breaks="A stepper that does not move the value, or a field that cannot be typed into once steppers are added."
        code={`<NumberField id="quantity" label="Quantity" min={0} max={100} value={value} onValueChange={setValue} />`}
        id="default"
        note="Type a number, press − or +, or focus the field and use the arrow keys. The readout shows what onValueChange received."
        title="Default"
      >
        <Live id="nf-default" initial={10} label="Quantity" max={100} min={0} readout />
      </State>

      <State
        breaks="A size whose steppers, text or radius drift from Input. NumberField reads the same tokens, so a row of both has to line up."
        id="sizes"
        title="Sizes"
      >
        <AxisMatrix
          axisName="size"
          defaultValue="md"
          render={(size) => (
            <div className="w-44">
              <Live
                aria-label={`${size} number`}
                initial={4}
                max={10}
                min={0}
                size={size as never}
              />
            </div>
          )}
          values={sizes}
        />
      </State>

      <State
        breaks="A description or error that is only visual: both are linked to the input with aria-describedby, and an error also sets aria-invalid."
        code={`<NumberField
  id="seats"
  label="Seats"
  description="Billed per seat each month."
  error="Enter a number from 1 to 50"
  min={1}
  max={50}
/>`}
        id="messages"
        note="Label, helper text, and an error string. A boolean error would flag the field without a message."
        title="Label, description, error"
      >
        <Row align="start">
          <Live
            description="Billed per seat each month."
            id="nf-desc"
            initial={5}
            label="Seats"
            max={50}
            min={1}
          />
          <Live
            error="Enter a number from 1 to 50"
            id="nf-error"
            initial={null}
            label="Seats"
            max={50}
            min={1}
            placeholder="1-50"
          />
        </Row>
      </State>

      <State
        breaks="A bound that lets a value escape: a stepper still enabled at the limit, or typed text that stays out of range after blur."
        id="clamp"
        note="Range 1 to 10. Type 99 and press Tab: the value commits as 10 and the + stepper disables. Press Home or End to jump to a bound."
        title="Min and max"
      >
        <Row align="start">
          <Live id="nf-clamp" initial={9} label="Seats (1-10)" max={10} min={1} readout />
          <Live id="nf-atmin" initial={1} label="At minimum" max={10} min={1} />
          <Live id="nf-atmax" initial={10} label="At maximum" max={10} min={1} />
        </Row>
      </State>

      <State
        breaks="A step that drifts: 0.1 accumulating float noise such as 0.30000000000000004, or a step of 5 ignoring the typed start."
        id="step"
        note="step 5 and step 0.1. Shift uses largeStep (10 by default) and Alt or Option uses smallStep (0.1 by default)."
        title="Step"
      >
        <Row align="start">
          <Live id="nf-step5" initial={0} label="Step 5" max={100} min={0} step={5} />
          <Live id="nf-step01" initial={0.3} label="Step 0.1" max={1} min={0} step={0.1} />
        </Row>
      </State>

      <State
        breaks="Formatting that groups or rounds a port or an id. The default is no grouping and full precision; grouped, currency and percent are opt-in through format."
        code={`<NumberField
  id="budget"
  label="Monthly budget"
  locale="en-US"
  format={{ style: "currency", currency: "USD" }}
  step={50}
  value={value}
  onValueChange={setValue}
/>`}
        id="format"
        note="Default, grouped, currency, percent (0.25 shows 25%), and a German locale that writes a decimal comma."
        title="Format and locale"
      >
        <Row align="start">
          <Live id="nf-plain" initial={12345.678} label="Default" />
          <Live
            format={{ useGrouping: true }}
            id="nf-grouped"
            initial={12345.678}
            label="Grouped"
          />
          <Live
            format={{ style: "currency", currency: "USD" }}
            id="nf-currency"
            initial={1200}
            label="Currency"
            locale="en-US"
            step={50}
          />
          <Live
            format={{ style: "percent" }}
            id="nf-percent"
            initial={0.25}
            label="Percent"
            max={1}
            min={0}
            step={0.05}
          />
          <Live
            format={{ minimumFractionDigits: 2 }}
            id="nf-de"
            initial={1234.5}
            label="de-DE"
            locale="de-DE"
          />
        </Row>
      </State>

      <State
        breaks="A suffix that is announced as part of the value, or that overlaps long digits. The suffix is decoration, so the label has to carry the unit."
        id="suffix"
        note="The suffix is aria-hidden. Put the unit in the label too."
        title="Suffix and hidden steppers"
      >
        <Row align="start">
          <Live id="nf-px" initial={16} label="Padding (px)" min={0} suffix="px" />
          <Live id="nf-pct" initial={80} label="Opacity (%)" max={100} min={0} suffix="%" />
          <Live hideSteppers id="nf-nosteppers" initial={443} label="Port" max={65535} min={1} />
        </Row>
      </State>

      <State
        breaks="A scrub label that cannot be reached without a pointer, or a field that changes while the page scrolls past it."
        id="scrub"
        note="Drag across the Padding label to change the value. Wheel scrubbing is off by default, so scrolling the page over a field never edits it; the right-hand field turns it on."
        title="Scrub label and wheel"
      >
        <Row align="start">
          <Live id="nf-scrub" initial={8} label="Padding" max={64} min={0} scrub suffix="px" />
          <Live allowWheelScrub id="nf-wheel" initial={8} label="Wheel scrub on" max={64} min={0} />
        </Row>
      </State>

      <State
        breaks="Existing forms keep their string state: value accepts a numeric string, and anything non-numeric reads as empty."
        id="string"
        note="The value is held as a string and fed back as one."
        title="String value"
      >
        <Stack>
          <NumberField
            id="nf-string"
            label="Width"
            onValueChange={(next) => setText(next === null ? "" : String(next))}
            value={text}
          />
          <p className="text-muted-foreground text-xs">State: {JSON.stringify(text)}</p>
        </Stack>
      </State>

      <State
        breaks="A disabled or read-only field that can still be changed through the steppers or the keyboard."
        id="disabled"
        note="Disabled dims the group and blocks focus. Read-only keeps the value selectable but ignores edits."
        title="Disabled and read-only"
      >
        <Row align="start">
          <Live disabled id="nf-disabled" initial={4} label="Disabled" max={10} min={0} />
          <Live id="nf-readonly" initial={4} label="Read-only" max={10} min={0} readOnly />
        </Row>
      </State>

      <State
        breaks="A long label or a long number pushing the steppers out of the group, or the group growing past its container."
        id="overflow"
        note="A long label above the group in a 15rem column, and a 16-digit value with a suffix in a 10rem group. Check that the steppers stay inside the border."
        title="Overflow — long label and long value"
      >
        <Row align="start">
          <div className="w-60 max-w-full">
            <Live id="nf-long-label" initial={3} label={LONG_LABEL} max={10} min={0} />
          </div>
          <div className="w-40">
            <Live aria-label="Very long value" initial={1234567890123456} suffix="bytes" />
          </div>
        </Row>
      </State>

      <State
        breaks="Steppers, suffix or label that use physical left/right and flip the wrong way in a right-to-left page."
        id="rtl"
        note="The same field under dir=rtl. Check which side the steppers and suffix land on and which side the border is drawn."
        title="Right-to-left"
      >
        <div dir="rtl">
          <Live id="nf-rtl" initial={12} label="الكمية" max={100} min={0} suffix="px" />
        </div>
      </State>

      <State
        breaks="A keyboard path that stops at the field: every stepping key has to work without the steppers."
        id="keyboard"
        note="Tab into the field; the steppers are separate tab stops after it."
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "↑ / ↓", does: "Step by the step value." },
            { keys: "Shift + ↑ / ↓", does: "Step by largeStep (10 by default)." },
            { keys: "Alt + ↑ / ↓", does: "Step by smallStep (0.1 by default)." },
            { keys: "Home / End", does: "Jump to min or max, when they are set." },
          ]}
        >
          <Live id="nf-keys" initial={50} label="Volume" max={100} min={0} readout />
        </KeyboardPath>
      </State>

      <State
        breaks="Nothing — this state exists to record an absence."
        id="no-loading"
        note="NumberField has no loading state. A value fetched asynchronously should render the field disabled until it arrives."
        title="States NumberField deliberately does not have"
      >
        <Specimen label="disabled while loading">
          <Live disabled id="nf-pending" initial={null} label="Quota" placeholder="Loading" />
        </Specimen>
      </State>

      <Aside title="Why not input type=number">
        <p>
          The OS spin buttons cannot be themed, the mouse wheel edits a value the user was only
          scrolling past, and the field accepts <code>e</code>, <code>+</code> and <code>-</code> in
          the middle of a number. NumberField replaces it and keeps string state working through{" "}
          <code>value</code>.
        </p>
      </Aside>
    </DemoPage>
  );
}
