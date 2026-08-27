"use client";

import { GridSquare, ListUnordered } from "@nebutra/icons";
import { Switch } from "@nebutra/ui/primitives";
import * as React from "react";
import { Aside, DemoPage, KeyboardPath, Row, Specimen, State } from "../demo-kit";

export default function SwitchDemo() {
  const [view, setView] = React.useState("source");

  return (
    <DemoPage>
      <State
        breaks="Reaching for this when a boolean was wanted. Switch is a segmented radio selector — two or three views of one surface. The on/off control is Toggle."
        id="default"
        note="Root plus Control children. Each Control is a radio, not a checkbox."
        title="Default"
      >
        <Switch name="demo-default">
          <Switch.Control defaultChecked label="Source" value="source" />
          <Switch.Control label="Output" value="output" />
        </Switch>
      </State>

      <State
        breaks="A controlled switcher that does not move when its value prop changes."
        id="controlled"
        note={`Controlled. Current value: ${view}.`}
        title="Controlled"
      >
        <Switch name="demo-controlled" onValueChange={setView} value={view}>
          <Switch.Control label="Source" value="source" />
          <Switch.Control label="Output" value="output" />
          <Switch.Control label="Preview" value="preview" />
        </Switch>
      </State>

      <State
        breaks="An icon-only segment with no accessible name. The label prop is still required — it becomes the accessible name even when an icon is supplied."
        id="icons"
        note="Icon segments. Both still carry a label."
        title="With icons"
      >
        <Row>
          <Specimen label="icon + label">
            <Switch name="demo-icon-label">
              <Switch.Control defaultChecked icon={<ListUnordered />} label="List" value="list" />
              <Switch.Control icon={<GridSquare />} label="Grid" value="grid" />
            </Switch>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A disabled switcher whose selected segment keeps full contrast, so it does not read as disabled."
        id="disabled"
        title="Disabled"
      >
        <Switch disabled name="demo-disabled">
          <Switch.Control defaultChecked label="Source" value="source" />
          <Switch.Control label="Output" value="output" />
        </Switch>
      </State>

      <State
        breaks="Segment labels of unequal length making the control jump width as the selection moves — the classic segmented-control defect. Click through all three."
        id="overflow"
        note="Deliberately uneven labels at a constrained width."
        title="Overflow — uneven segments"
      >
        <div className="max-w-[18rem] rounded-lg bg-background p-3">
          <Switch name="demo-overflow">
            <Switch.Control defaultChecked label="All" value="all" />
            <Switch.Control label="Needs review" value="review" />
            <Switch.Control label="Awaiting owner approval" value="approval" />
          </Switch>
        </div>
      </State>

      <State
        breaks="A segmented control that is three tab stops instead of one, or one where arrowing does not change the selection."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab", does: "enters the control once, on the selected segment." },
            { keys: "← →", does: "moves and selects — it behaves as a radio group." },
            { keys: "Tab", does: "leaves the whole control." },
          ]}
        >
          <Switch name="demo-keyboard">
            <Switch.Control defaultChecked label="Source" value="source" />
            <Switch.Control label="Output" value="output" />
            <Switch.Control label="Preview" value="preview" />
          </Switch>
        </KeyboardPath>
      </State>

      <Aside title="Switch versus Toggle">
        <p>
          The names run against the usual convention. In this library <code>Switch</code> is the
          segmented selector and <code>Toggle</code> is the on/off control. Both source files say so
          in their own docs; the pair is documented here because the naming is the trap.
        </p>
      </Aside>
    </DemoPage>
  );
}
