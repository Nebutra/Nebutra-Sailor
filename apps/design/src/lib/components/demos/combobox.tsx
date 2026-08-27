"use client";

import { Combobox } from "@nebutra/ui/primitives";
import * as React from "react";
import {
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
  { value: "iad1", label: "Washington, D.C." },
  { value: "cle1", label: "Cleveland" },
  { value: "sfo1", label: "San Francisco" },
  { value: "fra1", label: "Frankfurt" },
  { value: "hnd1", label: "Tokyo" },
  { value: "syd1", label: "Sydney", disabled: true },
];

const GROUPED = [
  { value: "iad1", label: "Washington, D.C.", group: "Americas" },
  { value: "sfo1", label: "San Francisco", group: "Americas" },
  { value: "fra1", label: "Frankfurt", group: "Europe" },
  { value: "dub1", label: "Dublin", group: "Europe" },
  { value: "hnd1", label: "Tokyo", group: "Asia Pacific" },
];

export default function ComboboxDemo({ derived }: DemoProps) {
  const sizes = derived.axes.size ?? [];
  const [loading, setLoading] = React.useState(false);
  const [errored, setErrored] = React.useState(false);
  const [disabled, setDisabled] = React.useState(false);

  return (
    <DemoPage>
      <State
        breaks="A searchable select whose filter is case-sensitive, or whose list opens off-screen. Open it and type “tok”."
        id="default"
        note="Click the trigger, then type to filter. The search field is inside the popover."
        title="Default"
      >
        <div className="max-w-sm">
          <Combobox label="Region" options={REGIONS} placeholder="Select a region" width={280} />
        </div>
      </State>

      <State
        breaks="A size whose trigger height stops matching Input and Select at the equivalent step. Note the names differ — small/medium/large here, sm/md/lg on Input."
        id="sizes"
        title="Sizes"
      >
        <AxisMatrix
          axisName="size"
          className="items-end"
          defaultValue="medium"
          render={(size) => (
            <Combobox options={REGIONS} placeholder={size} size={size as never} width={200} />
          )}
          values={sizes}
        />
      </State>

      <State
        breaks="The three states an async select actually spends its life in. Loading that hides the trigger, an empty result that shows a blank box, and an error that looks like a valid selection are all live bugs — toggle them here."
        id="async"
        note="loading, empty and error are first-class props on this component; it does not need a wrapper to express them."
        title="Loading, empty and error"
      >
        <Controls>
          <ControlButton active={loading} onClick={() => setLoading((v) => !v)}>
            loading
          </ControlButton>
          <ControlButton active={errored} onClick={() => setErrored((v) => !v)}>
            errored
          </ControlButton>
          <ControlButton active={disabled} onClick={() => setDisabled((v) => !v)}>
            disabled
          </ControlButton>
        </Controls>
        <Row align="start">
          <Specimen label="options present">
            <Combobox
              disabled={disabled}
              errored={errored}
              loading={loading}
              loadingMessage="Fetching regions…"
              options={REGIONS}
              placeholder="Select a region"
              width={240}
            />
          </Specimen>
          <Specimen label="options={[]} — empty result">
            <Combobox
              disabled={disabled}
              emptyMessage="No region matches this project's plan."
              errored={errored}
              options={[]}
              placeholder="Select a region"
              width={240}
            />
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A group header that scrolls away without a sticky treatment, or a group with one item that reads as a header for the next group."
        id="groups"
        note="Options carry a group key; the component builds the sections."
        title="Grouped options"
      >
        <div className="max-w-sm">
          <Combobox label="Region" options={GROUPED} placeholder="Select a region" width={280} />
        </div>
      </State>

      <State
        breaks="A long label that widens the popover past the trigger, or a trigger that grows to fit its value instead of truncating."
        id="overflow"
        note="listMaxWidth caps the popover independently of the trigger width."
        title="Overflow — long option"
      >
        <div className="max-w-[16rem] rounded-lg bg-background p-3">
          <Combobox
            listMaxWidth={260}
            options={[
              {
                value: "long",
                label:
                  "Provisioning a dedicated single-tenant analytics cluster in Frankfurt (eu-central-1)",
              },
              ...REGIONS,
            ]}
            placeholder="Select a region"
            width={220}
          />
        </div>
      </State>

      <State
        breaks="A combobox that traps focus in the search field, or one where typing filters the list but Enter selects the wrong row."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab", does: "focuses the trigger." },
            { keys: "Enter / Space", does: "opens the popover with focus in the search field." },
            { keys: "type", does: "filters the list; the first match becomes active." },
            { keys: "↑ ↓", does: "moves the active option without leaving the search field." },
            { keys: "Enter", does: "selects the active option and closes." },
            { keys: "Escape", does: "closes and restores focus to the trigger." },
          ]}
        >
          <Combobox
            aria-label="Deployment region"
            options={REGIONS}
            placeholder="Select a region"
            width={280}
          />
        </KeyboardPath>
      </State>
    </DemoPage>
  );
}
