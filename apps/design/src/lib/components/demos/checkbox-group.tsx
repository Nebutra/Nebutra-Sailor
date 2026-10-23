"use client";

import { Button, Checkbox, CheckboxGroup } from "@nebutra/ui/primitives";
import * as React from "react";
import { DemoPage, KeyboardPath, LONG_LABEL, Row, Specimen, Stack, State } from "../demo-kit";
import type { DemoProps } from "../derived";

const SURFACES = [
  { id: "background", label: "background", className: "bg-background" },
  { id: "card", label: "card", className: "bg-card" },
  { id: "muted", label: "muted", className: "bg-muted" },
  { id: "popover", label: "popover", className: "bg-popover" },
];

function FormReadout() {
  const [submitted, setSubmitted] = React.useState<string[] | null>(null);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(new FormData(event.currentTarget).getAll("channel").map(String));
      }}
    >
      <Stack>
        <CheckboxGroup label="Channels">
          <Checkbox name="channel" value="email">
            Email
          </Checkbox>
          <Checkbox defaultChecked name="channel" value="sms">
            SMS
          </Checkbox>
          <Checkbox name="channel" value="push">
            Push
          </Checkbox>
        </CheckboxGroup>
        <Row>
          <Button type="submit">Read values</Button>
          <span className="font-mono text-muted-foreground text-xs">
            FormData.getAll("channel") = {submitted ? JSON.stringify(submitted) : "not read yet"}
          </span>
        </Row>
      </Stack>
    </form>
  );
}

export default function CheckboxGroupDemo(_: DemoProps) {
  return (
    <DemoPage>
      <State
        breaks="A group heading that is not the group's accessible name, or boxes that stack with no gap. The label is both the visible heading and aria-label."
        code={`<CheckboxGroup label="Notifications">
  <Checkbox defaultChecked>Email</Checkbox>
  <Checkbox>SMS</Checkbox>
  <Checkbox>Push</Checkbox>
</CheckboxGroup>`}
        id="default"
        note="Vertical is the default: a labelled column with 12px between boxes. The group keeps no state of its own."
        title="Default"
      >
        <CheckboxGroup label="Notifications">
          <Checkbox defaultChecked>Email</Checkbox>
          <Checkbox>SMS</Checkbox>
          <Checkbox>Push</Checkbox>
        </CheckboxGroup>
      </State>

      <State
        breaks="A horizontal group that overflows its container instead of wrapping onto a second row."
        code={`<CheckboxGroup label="Notifications" orientation="horizontal">…</CheckboxGroup>`}
        id="horizontal"
        note="Horizontal lays the label and boxes out in a wrapping row. Narrow the container and the boxes flow onto the next line."
        title="Horizontal"
      >
        <Stack>
          <CheckboxGroup label="Notifications" orientation="horizontal">
            <Checkbox defaultChecked>Email</Checkbox>
            <Checkbox>SMS</Checkbox>
            <Checkbox>Push</Checkbox>
            <Checkbox>In-app</Checkbox>
          </CheckboxGroup>
          <div className="max-w-[16rem] rounded-lg bg-background p-3">
            <CheckboxGroup label="Notifications" orientation="horizontal">
              <Checkbox defaultChecked>Email</Checkbox>
              <Checkbox>SMS</Checkbox>
              <Checkbox>Push</Checkbox>
              <Checkbox>In-app</Checkbox>
            </CheckboxGroup>
          </div>
        </Stack>
      </State>

      <State
        breaks="An unchecked box that disappears into its surface. WCAG 1.4.11 asks for 3:1 on the control's edge, and the page background, card, muted and popover surfaces all differ. Switch the language and the theme above and check every tile."
        id="off-state"
        note="Unchecked and checked boxes on each surface token. The empty box draws a --control-border edge derived from each language's own foreground and background, so it stays visible in all of them."
        title="Unchecked on every surface"
      >
        <Row align="start">
          {SURFACES.map((surface) => (
            <Specimen key={surface.id} label={surface.label}>
              <div className={`rounded-lg border border-border p-4 ${surface.className}`}>
                <CheckboxGroup label="Scopes">
                  <Checkbox>Read</Checkbox>
                  <Checkbox defaultChecked>Write</Checkbox>
                </CheckboxGroup>
              </div>
            </Specimen>
          ))}
        </Row>
      </State>

      <State
        breaks="Disabling the group is not a thing: no prop on the group reaches the boxes. Each Checkbox is disabled on its own, and the dimmed label has to follow its box."
        id="disabled"
        note="There is no group-level disabled prop. Left: one box disabled. Right: every box disabled, checked and unchecked."
        title="Disabled"
      >
        <Row align="start" className="gap-12">
          <CheckboxGroup label="One disabled">
            <Checkbox defaultChecked>Read</Checkbox>
            <Checkbox disabled>Write (requires owner)</Checkbox>
          </CheckboxGroup>
          <CheckboxGroup label="All disabled">
            <Checkbox defaultChecked disabled>
              Read
            </Checkbox>
            <Checkbox disabled>Write</Checkbox>
          </CheckboxGroup>
        </Row>
      </State>

      <State
        breaks="A group with no label, which has role=group but no accessible name, so a screen reader announces an anonymous group."
        id="unlabelled"
        note="Without label the heading is omitted and the aria-label is undefined. CheckboxGroup forwards no aria-label or aria-labelledby, so an unlabelled group cannot be named from outside; give it a label."
        title="No label"
      >
        <CheckboxGroup>
          <Checkbox defaultChecked>Remember me</Checkbox>
          <Checkbox>Send me product updates</Checkbox>
        </CheckboxGroup>
      </State>

      <State
        breaks="A long label that wraps under its box instead of staying indented, or that widens the group past its container."
        id="overflow"
        note="At a constrained width the label wraps and the second line aligns with the first, not with the box. A very long group label wraps too."
        title="Overflow — long label"
      >
        <div className="max-w-[18rem] rounded-lg bg-background p-3">
          <CheckboxGroup label={LONG_LABEL}>
            <Checkbox>{LONG_LABEL}</Checkbox>
            <Checkbox defaultChecked>Read</Checkbox>
          </CheckboxGroup>
        </div>
      </State>

      <State
        breaks="An empty group that renders a heading with nothing under it."
        id="empty"
        note="A group with no children still renders its label. That is a call-site bug, and this is what it looks like so it is recognisable."
        title="Empty"
      >
        <CheckboxGroup label="Scopes">{null}</CheckboxGroup>
      </State>

      <State
        breaks="Right-to-left layout in which the gap between a box and its label lands on the wrong side."
        id="rtl"
        note="dir=rtl on the wrapper puts the box on the right with its label to the left, spaced by margin-inline-start."
        title="Right-to-left layout"
      >
        <div dir="rtl">
          <CheckboxGroup label="Notifications">
            <Checkbox defaultChecked>Email</Checkbox>
            <Checkbox>SMS</Checkbox>
          </CheckboxGroup>
        </div>
      </State>

      <State
        breaks="Boxes inside a form that submit nothing because the native input lost its name or value. The group adds no value of its own, so the form is the only way to read the set."
        id="form"
        note="The group does not collect values. Give each Checkbox a shared name and its own value and read them with FormData on submit."
        title="Reading the values"
      >
        <FormReadout />
      </State>

      <State
        breaks="A group that behaves as a single tab stop like a radio group, or a box that toggles on Enter instead of Space."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            {
              keys: "Tab",
              does: "moves through each enabled checkbox in turn; the group is not one tab stop.",
            },
            { keys: "Space", does: "toggles the focused checkbox." },
            { keys: "Enter", does: "does not toggle the checkbox." },
          ]}
        >
          <CheckboxGroup label="Scopes">
            <Checkbox>Read</Checkbox>
            <Checkbox>Write</Checkbox>
            <Checkbox disabled>Admin (requires owner)</Checkbox>
          </CheckboxGroup>
        </KeyboardPath>
      </State>
    </DemoPage>
  );
}
