"use client";

import { Checkbox, CheckboxGroup } from "@nebutra/ui/primitives";
import * as React from "react";
import {
  Aside,
  DemoPage,
  KeyboardPath,
  LONG_LABEL,
  Row,
  Specimen,
  Stack,
  State,
} from "../demo-kit";

export default function CheckboxDemo() {
  const [checked, setChecked] = React.useState([true, false, false]);
  const all = checked.every(Boolean);
  const some = checked.some(Boolean) && !all;

  return (
    <DemoPage>
      <State
        breaks="A checkbox whose label is not clickable, or whose hit area is only the box."
        id="default"
        note="The label is part of the control — click the text, not just the box."
        title="Default"
      >
        <CheckboxGroup label="Notifications">
          <Checkbox>Deploy succeeded</Checkbox>
          <Checkbox defaultChecked>Deploy failed</Checkbox>
          <Checkbox>Domain expiring</Checkbox>
        </CheckboxGroup>
      </State>

      <State
        breaks="The three-value state. An indeterminate parent that renders as unchecked loses the information that some children are on — toggle a child below and watch the parent."
        id="indeterminate"
        note="Unchecked, indeterminate and checked, driven live from the children."
        title="Checked, unchecked, indeterminate"
      >
        <Stack>
          <Checkbox
            checked={all}
            indeterminate={some}
            onChange={(next: boolean) => setChecked([next, next, next])}
          >
            All features
          </Checkbox>
          <div className="ml-6 flex flex-col gap-2">
            {["Analytics", "Notifications", "API access"].map((label, i) => (
              <Checkbox
                checked={checked[i] ?? false}
                key={label}
                onChange={(next: boolean) =>
                  setChecked((prev) => prev.map((v, j) => (j === i ? next : v)))
                }
              >
                {label}
              </Checkbox>
            ))}
          </div>
        </Stack>
      </State>

      <State
        breaks="A disabled checkbox that still looks interactive, or one whose label keeps full contrast while the box dims."
        id="disabled"
        note="Both states, disabled. The label must dim with the box."
        title="Disabled"
      >
        <Row>
          <Specimen label="disabled">
            <Checkbox disabled>Unchecked</Checkbox>
          </Specimen>
          <Specimen label="disabled checked">
            <Checkbox defaultChecked disabled>
              Checked
            </Checkbox>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A long label that wraps under the box instead of staying indented, which is the single most common checkbox layout defect."
        id="overflow"
        note="Wrapped label at a constrained width — the second line must align with the first, not with the box."
        title="Overflow — long label"
      >
        <div className="max-w-[18rem] rounded-lg bg-background p-3">
          <CheckboxGroup label="Scopes">
            <Checkbox>{LONG_LABEL}</Checkbox>
            <Checkbox defaultChecked>Read</Checkbox>
          </CheckboxGroup>
        </div>
      </State>

      <State
        breaks="An empty group that renders a legend with nothing under it."
        id="empty"
        note="A group with no children still renders its label. That is a call-site bug, and this is what it looks like so it is recognisable."
        title="Empty group"
      >
        <CheckboxGroup label="Scopes">{null}</CheckboxGroup>
      </State>

      <State
        breaks="A checkbox that responds to Enter instead of Space, or one that cannot be reached at all because the native input was replaced rather than hidden."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            {
              keys: "Tab",
              does: "moves to each checkbox in turn — a group is not a single tab stop.",
            },
            { keys: "Space", does: "toggles the focused checkbox." },
            { keys: "Enter", does: "does nothing. Enter submits forms; Space toggles checkboxes." },
          ]}
        >
          <CheckboxGroup label="Scopes">
            <Checkbox>Read</Checkbox>
            <Checkbox>Write</Checkbox>
            <Checkbox disabled>Admin (requires owner)</Checkbox>
          </CheckboxGroup>
        </KeyboardPath>
      </State>

      <Aside title="This one is not on the semantic tokens">
        <p>
          Checkbox styles itself from the <code>geist-gray-*</code> and{" "}
          <code>geist-background-*</code> scale rather than the semantic tokens the rest of the
          library uses. That means a theme change to <code>--muted</code> or <code>--border</code>{" "}
          moves everything except this control. It is visible here rather than described elsewhere:
          switch the page to dark and compare the box edge against the Input above it.
        </p>
      </Aside>
    </DemoPage>
  );
}
