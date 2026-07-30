"use client";

import { Globe } from "@nebutra/icons";
import { Select } from "@nebutra/ui/primitives";
import * as React from "react";
import {
  Aside,
  AxisMatrix,
  ControlButton,
  Controls,
  DemoPage,
  KeyboardPath,
  Row,
  Specimen,
  State,
} from "../demo-kit";
import type { DemoProps } from "../derived";

const REGIONS = [
  { value: "iad1", label: "Washington, D.C. (iad1)" },
  { value: "sfo1", label: "San Francisco (sfo1)" },
  { value: "fra1", label: "Frankfurt (fra1)" },
  { value: "hnd1", label: "Tokyo (hnd1)" },
  { value: "syd1", label: "Sydney (syd1) — at capacity", disabled: true },
] as const;

/** Empty "all" needs a sentinel value; value="" is not a usable option value. */
const ALL = "__all__";

export default function SelectDemo({ derived }: DemoProps) {
  const sizes = derived.axes.size ?? [];
  const [error, setError] = React.useState(false);
  const [disabled, setDisabled] = React.useState(false);
  const [filter, setFilter] = React.useState<string | undefined>(undefined);

  return (
    <DemoPage>
      <State
        breaks="A themed trigger paired with an unthemed OS popup. Open this in the dark theme: the list must be dark too. That is the whole reason raw select is banned in apps."
        id="default"
        note="The default is a listbox, not an OS select. Open it and the options are inside the design system."
        title="Default"
      >
        <div className="max-w-sm">
          <Select
            label="Region"
            options={REGIONS}
            placeholder="Choose a region"
            prefix={<Globe />}
          />
        </div>
      </State>

      <State
        breaks="A size whose trigger height drifts from Input's at the same size name, which shows up as a ragged form row."
        id="sizes"
        note="Sizes come from the SelectSize union in tokens/components/select.ts. Note it has four steps, not Input's three."
        title="Sizes"
      >
        <AxisMatrix
          axisName="size"
          className="items-end"
          defaultValue="medium"
          render={(size) => (
            <div className="w-48">
              <Select options={REGIONS} placeholder={size} size={size as never} />
            </div>
          )}
          values={sizes}
        />
      </State>

      <State
        breaks="An error state that only colours the message and leaves the trigger looking valid."
        id="error"
        title="Error and disabled"
      >
        <Controls>
          <ControlButton active={error} onClick={() => setError((v) => !v)}>
            error
          </ControlButton>
          <ControlButton active={disabled} onClick={() => setDisabled((v) => !v)}>
            disabled
          </ControlButton>
        </Controls>
        <div className="max-w-sm">
          <Select
            disabled={disabled}
            error={error ? "Pick a region before deploying." : undefined}
            label="Region"
            options={REGIONS}
            placeholder="Choose a region"
          />
        </div>
      </State>

      <State
        breaks="A disabled option that is still selectable by keyboard. Open the list and arrow down onto Sydney."
        id="disabled-option"
        note="One option in the list is disabled at the data level."
        title="Disabled option"
      >
        <div className="max-w-sm">
          <Select defaultValue="fra1" options={REGIONS} />
        </div>
      </State>

      <State
        breaks='A filter select that uses value="" for its "All" row. An empty string is not a usable option value; the sentinel is.'
        id="empty"
        note="An unset filter renders the sentinel row, not an empty trigger."
        title="Empty and unset"
      >
        <Row align="start">
          <Specimen label="unset — placeholder showing">
            <div className="w-56">
              <Select options={REGIONS} placeholder="Any region" />
            </div>
          </Specimen>
          <Specimen label="sentinel 'All' option">
            <div className="w-56">
              <Select
                onValueChange={(next) => setFilter(!next || next === ALL ? undefined : next)}
                options={[{ value: ALL, label: "All regions" }, ...REGIONS]}
                value={filter ?? ALL}
              />
            </div>
          </Specimen>
          <Specimen label="options={[]} — nothing to choose">
            <div className="w-56">
              <Select options={[]} placeholder="No regions available" />
            </div>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A long option label that widens the trigger past its container, or one that clips without an ellipsis."
        id="overflow"
        title="Overflow — long option"
      >
        <div className="max-w-[14rem] rounded-lg bg-background p-3">
          <Select
            defaultValue="long"
            options={[
              {
                value: "long",
                label: "Provisioning a dedicated single-tenant cluster in Frankfurt (eu-central-1)",
              },
              ...REGIONS,
            ]}
          />
        </div>
      </State>

      <State
        breaks="A listbox that cannot be opened from the keyboard, or one that does not return focus to the trigger on close."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab", does: "focuses the trigger." },
            { keys: "Enter / Space / ↓", does: "opens the list with the current value focused." },
            { keys: "↑ ↓", does: "moves through options, skipping the disabled one." },
            { keys: "Home / End", does: "jumps to the first and last option." },
            { keys: "Enter", does: "selects and closes, returning focus to the trigger." },
            { keys: "Escape", does: "closes without changing the value." },
          ]}
        >
          <div className="max-w-sm">
            <Select defaultValue="iad1" label="Region" options={REGIONS} />
          </div>
        </KeyboardPath>
      </State>

      <Aside title="native is opt-in and almost always wrong">
        <p>
          <code>native</code> renders a real OS <code>&lt;select&gt;</code>. It is kept for the rare
          case that genuinely needs one. An OS option menu cannot be themed, so in the dark theme it
          opens as a white system popup — which is why product apps must not use it. There is a
          documented escape hatch comment for the exceptions; <code>NativeSelectProps</code> itself
          is marked deprecated in the source.
        </p>
      </Aside>
    </DemoPage>
  );
}
