"use client";

import { DatePicker } from "@nebutra/ui/primitives";
import * as React from "react";
import { Aside, AxisMatrix, DemoPage, KeyboardPath, Row, Stack, State } from "../demo-kit";
import type { DemoProps } from "../derived";

/** Holds the ISO value so typing, picking and clearing have something to change. */
function Live({
  initial = "",
  readout = true,
  ...props
}: { initial?: string; readout?: boolean } & Omit<
  React.ComponentProps<typeof DatePicker>,
  "value" | "defaultValue" | "onValueChange"
>) {
  const [value, setValue] = React.useState(initial);
  return (
    <div className="grid w-64 max-w-full gap-2">
      <DatePicker {...props} onValueChange={setValue} value={value} />
      {readout ? (
        <p aria-live="polite" className="text-muted-foreground text-xs">
          Value: {value === "" ? '"" (cleared)' : value}
        </p>
      ) : null}
    </div>
  );
}

export default function DatePickerDemo({ derived }: DemoProps) {
  const sizes = derived.axes.size?.length ? derived.axes.size : ["sm", "md", "lg"];

  return (
    <DemoPage>
      <State
        breaks="A calendar button that opens a picker disconnected from the field, so the value picked and the value shown disagree."
        code={`<DatePicker
  id="due-date"
  label="Due date"
  value={date}
  onValueChange={setDate}
/>`}
        id="default"
        note="Empty to start. Open the calendar with the button, pick a day, and the field and the readout both update."
        title="Default"
      >
        <Live id="dp-default" label="Due date" />
      </State>

      <State
        breaks="A size whose field or calendar button drifts from Input. DatePicker reads the same tokens, so a row of both has to line up."
        id="sizes"
        title="Sizes"
      >
        <AxisMatrix
          axisName="size"
          defaultValue="md"
          render={(size) => (
            <div className="w-56">
              <DatePicker
                aria-label={`${size} date`}
                defaultValue="2026-10-23"
                size={size as never}
              />
            </div>
          )}
          values={sizes}
        />
      </State>

      <State
        breaks="Typing that rewrites itself on every keystroke, or an unparseable string that survives blur and reads back as if it were accepted."
        id="typing"
        note='Type 2026-12-31 and the value commits as soon as it parses. Type "2026-1" and blur: the field falls back to the last accepted value. Clear the text and the value becomes an empty string.'
        title="Typed entry"
      >
        <Live id="dp-typed" initial="2026-10-23" label="Start date" />
      </State>

      <State
        breaks="A display format leaking into the value: callers always receive yyyy-MM-dd, whatever the field shows."
        code={`<DatePicker id="start" label="Start" displayFormat="dd/MM/yyyy" value={date} onValueChange={setDate} />`}
        id="format"
        note="Three display formats for the same date. Type in the format you see; the readout stays ISO."
        title="Display format"
      >
        <Row align="start">
          <Live id="dp-iso" initial="2026-10-23" label="yyyy-MM-dd" />
          <Live displayFormat="dd/MM/yyyy" id="dp-dmy" initial="2026-10-23" label="dd/MM/yyyy" />
          <Live displayFormat="MMM d, yyyy" id="dp-mdy" initial="2026-10-23" label="MMM d, yyyy" />
        </Row>
      </State>

      <State
        breaks="A bound that one entry path ignores. Days outside min and max are disabled in the grid, and a date typed outside them must not commit either."
        code={`<DatePicker id="launch" label="Launch" min="2026-10-05" max="2026-10-28" />`}
        id="bounds"
        note="Bounded to 5 to 28 October 2026. Open the calendar: earlier and later days are disabled and navigation stops at those months. Then type 2026-11-15 into the field: the value is not committed, the field is marked invalid while you type, and on blur it returns to the last committed date."
        title="Min and max"
      >
        <Live
          id="dp-bounds"
          initial="2026-10-12"
          label="Launch"
          max="2026-10-28"
          min="2026-10-05"
        />
      </State>

      <State
        breaks="A description or error that is only visual: both are linked to the field with aria-describedby, and a string error is announced when it appears."
        id="messages"
        note="Helper text, and an error string. The helper text is replaced by the error when there is one. A boolean error flags the field without a message."
        title="Description and error"
      >
        <Row align="start">
          <Live
            description="Shown to the client on the invoice."
            id="dp-desc"
            initial="2026-10-23"
            label="Invoice date"
          />
          <Live error="Pick a weekday" id="dp-error" initial="2026-10-24" label="Delivery date" />
        </Row>
      </State>

      <State
        breaks="A disabled picker whose calendar button still opens, or whose text field still takes focus."
        id="disabled"
        note="Disabled blocks the field and the calendar button. A required field carries the native required attribute."
        title="Disabled and required"
      >
        <Row align="start">
          <Live disabled id="dp-disabled" initial="2026-10-23" label="Locked date" />
          <Live id="dp-required" label="Birth date (required)" required />
        </Row>
      </State>

      <State
        breaks="Calendar options that stop reaching the grid: the picker passes a fixed set through to Calendar and must keep passing it."
        id="calendar-options"
        note="Two months, a Monday week start, six fixed weeks, and no outside days. Open each calendar."
        title="Calendar options"
      >
        <Row align="start">
          <Live id="dp-two" initial="2026-10-23" label="Two months" numberOfMonths={2} />
          <Live id="dp-monday" initial="2026-10-23" label="Monday first" weekStartsOn={1} />
          <Live
            fixedWeeks
            id="dp-fixed"
            initial="2026-10-23"
            label="Fixed weeks, no outside days"
            showOutsideDays={false}
          />
        </Row>
      </State>

      <State
        breaks="A field that grows with its value instead of scrolling, or a calendar button pushed out of the field by a long formatted date."
        id="overflow"
        note="A long display format in a narrow field, and a long label. The input scrolls its text and the calendar button stays put."
        title="Overflow — long value and long label"
      >
        <Stack>
          <div className="w-44">
            <DatePicker
              aria-label="Long formatted date"
              defaultValue="2026-10-23"
              displayFormat="EEEE, MMMM do, yyyy"
            />
          </div>
          <div className="w-64 max-w-full">
            <DatePicker
              id="dp-long-label"
              label="Provisioning window start for the dedicated Frankfurt cluster"
            />
          </div>
        </Stack>
      </State>

      <State
        breaks="A calendar or text field that stays left-to-right in a right-to-left page."
        id="rtl"
        note="dir=rtl is passed to the picker and reaches both the text field and the opened calendar, which mirrors its navigation arrows and week order."
        title="Right-to-left calendar"
      >
        <Live dir="rtl" id="dp-rtl" initial="2026-10-23" label="Date" />
      </State>

      <State
        breaks="A keyboard path that needs a pointer: the field, the button and the day grid must all be reachable, and the popover must close without a click."
        id="keyboard"
        note="Tab to the field, type if you like, then Tab to the calendar button."
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab", does: "Move from the field to the calendar button." },
            { keys: "Enter / Space", does: "Open the calendar. Focus lands on the selected day." },
            { keys: "← → ↑ ↓", does: "Move by day and by week." },
            { keys: "PageUp / PageDown", does: "Move by month. With Shift, by year." },
            { keys: "Home / End", does: "Move to the start or end of the week." },
            { keys: "Enter", does: "Pick the focused day and close the calendar." },
            { keys: "Esc", does: "Close the calendar without picking." },
          ]}
        >
          <Live id="dp-keys" initial="2026-10-23" label="Date" />
        </KeyboardPath>
      </State>

      <State
        breaks="Nothing — this state exists to record an absence."
        id="no-loading"
        note="DatePicker has no loading state and no read-only state. A read-only value should be shown as text, or disabled."
        title="States DatePicker deliberately does not have"
      >
        <Row>
          <Live disabled id="dp-fetching" label="Renewal date" readout={false} />
        </Row>
      </State>

      <Aside title="Why not input type=date">
        <p>
          The native picker is drawn by the OS and ignores the theme. DatePicker keeps typing, since
          entering a far-off date without paging through months is the one real advantage of a
          native date field, and returns the same <code>yyyy-MM-dd</code> string that{" "}
          <code>input.value</code> did.
        </p>
      </Aside>
    </DemoPage>
  );
}
