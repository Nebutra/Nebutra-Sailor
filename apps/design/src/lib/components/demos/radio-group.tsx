"use client";

import { RadioGroup } from "@nebutra/ui/primitives";
import * as React from "react";
import { DemoPage, KeyboardPath, LONG_LABEL, Row, Specimen, State } from "../demo-kit";

export default function RadioGroupDemo() {
  const [value, setValue] = React.useState("iad1");

  return (
    <DemoPage>
      <State
        breaks="A radio group where each item is its own tab stop. A radio group is one tab stop; the arrows move within it."
        id="default"
        note="The group takes a label; items are compound children."
        title="Default"
      >
        <RadioGroup defaultValue="iad1" label="Deployment region">
          <RadioGroup.Item value="iad1">Washington, D.C.</RadioGroup.Item>
          <RadioGroup.Item value="sfo1">San Francisco</RadioGroup.Item>
          <RadioGroup.Item value="fra1">Frankfurt</RadioGroup.Item>
        </RadioGroup>
      </State>

      <State
        breaks="A controlled group that does not reflect the value it was given, which shows up as a radio that will not stay selected."
        id="controlled"
        note={`Controlled. Current value: ${value}.`}
        title="Controlled"
      >
        <RadioGroup label="Deployment region" onValueChange={setValue} value={value}>
          <RadioGroup.Item value="iad1">Washington, D.C.</RadioGroup.Item>
          <RadioGroup.Item value="sfo1">San Francisco</RadioGroup.Item>
          <RadioGroup.Item value="fra1">Frankfurt</RadioGroup.Item>
        </RadioGroup>
      </State>

      <State
        breaks="A whole group disabled versus one item disabled. The second case must still be reachable by arrow keys as a skipped option, not silently vanish."
        id="disabled"
        title="Disabled — group and single item"
      >
        <Row align="start">
          <Specimen label="group disabled">
            <RadioGroup defaultValue="iad1" disabled label="Region">
              <RadioGroup.Item value="iad1">Washington, D.C.</RadioGroup.Item>
              <RadioGroup.Item value="sfo1">San Francisco</RadioGroup.Item>
            </RadioGroup>
          </Specimen>
          <Specimen label="one item disabled">
            <RadioGroup defaultValue="iad1" label="Region">
              <RadioGroup.Item value="iad1">Washington, D.C.</RadioGroup.Item>
              <RadioGroup.Item disabled value="syd1">
                Sydney — at capacity
              </RadioGroup.Item>
            </RadioGroup>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="No selection at all. A group with no defaultValue must render every radio unselected rather than quietly selecting the first."
        id="empty"
        note="No defaultValue, so nothing is selected until the user chooses."
        title="Nothing selected"
      >
        <RadioGroup label="Region">
          <RadioGroup.Item value="iad1">Washington, D.C.</RadioGroup.Item>
          <RadioGroup.Item value="sfo1">San Francisco</RadioGroup.Item>
        </RadioGroup>
      </State>

      <State
        breaks="A wrapped label that runs back under the radio, breaking the indent."
        id="overflow"
        title="Overflow — long label"
      >
        <div className="max-w-[18rem] rounded-lg bg-background p-3">
          <RadioGroup defaultValue="long" label="Plan">
            <RadioGroup.Item value="long">{LONG_LABEL}</RadioGroup.Item>
            <RadioGroup.Item value="short">Shared</RadioGroup.Item>
          </RadioGroup>
        </div>
      </State>

      <State
        breaks="Arrow keys that do not wrap at the ends, or a group that requires Space after arrowing — in a radio group, arrowing selects."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab", does: "enters the group once, landing on the selected radio." },
            { keys: "↑ ↓ ← →", does: "moves and selects in one step, wrapping at the ends." },
            { keys: "Tab", does: "leaves the whole group — it is a single tab stop." },
            { keys: "Space", does: "selects the focused radio when nothing was selected yet." },
          ]}
        >
          <RadioGroup defaultValue="sfo1" label="Region">
            <RadioGroup.Item value="iad1">Washington, D.C.</RadioGroup.Item>
            <RadioGroup.Item value="sfo1">San Francisco</RadioGroup.Item>
            <RadioGroup.Item disabled value="syd1">
              Sydney
            </RadioGroup.Item>
            <RadioGroup.Item value="fra1">Frankfurt</RadioGroup.Item>
          </RadioGroup>
        </KeyboardPath>
      </State>
    </DemoPage>
  );
}
