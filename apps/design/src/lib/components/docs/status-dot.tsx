"use client";

import { StatusDot } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

function stateLabel(state: string) {
  return state.charAt(0) + state.slice(1).toLowerCase();
}

function Status({
  state,
  presentation,
  titlePrefix,
}: {
  state: string;
  presentation: string;
  titlePrefix: string;
}) {
  return presentation === "decorative" ? (
    <div className="flex items-center gap-2 text-foreground text-sm">
      <StatusDot decorative state={state as never} titlePrefix={titlePrefix} />
      <span>{stateLabel(state)}</span>
    </div>
  ) : (
    <StatusDot label={presentation === "label"} state={state as never} titlePrefix={titlePrefix} />
  );
}

export function Playground({ derived }: DemoProps) {
  const states = derived.axes.state ?? [];
  const knobs: Knob[] = [
    {
      name: "state",
      type: "select",
      options: states,
      defaultValue: states.includes("READY") ? "READY" : (states[0] ?? "READY"),
    },
    {
      name: "presentation",
      type: "select",
      options: ["label", "dot", "decorative"],
      defaultValue: "label",
      hint: "Maps to label or decorative; decorative includes adjacent state text.",
    },
    { name: "titlePrefix", type: "text", defaultValue: "Production deployment" },
  ];
  return (
    <ComponentPlayground
      caption="States come from DeploymentState. QUEUED and BUILDING pulse; terminal states stay still, and reduced motion stops the pulse. Dot-only output keeps its accessible state name; decorative output relies on the adjacent text."
      code={(v) => {
        const dot = jsx({
          name: "StatusDot",
          props: {
            state: String(v.state),
            label: v.presentation === "label",
            decorative: v.presentation === "decorative",
            titlePrefix: String(v.titlePrefix),
          },
        });
        return snippet({
          imports: [{ names: ["StatusDot"], from: "@nebutra/ui/primitives" }],
          body:
            v.presentation === "decorative"
              ? jsx({
                  name: "div",
                  props: { className: "flex items-center gap-2 text-foreground text-sm" },
                  children: [
                    dot,
                    jsx({
                      name: "span",
                      props: {},
                      children: raw(JSON.stringify(stateLabel(String(v.state)))),
                    }),
                  ],
                })
              : dot,
        });
      }}
      knobs={knobs}
      render={(v) => (
        <Status
          presentation={String(v.presentation)}
          state={String(v.state)}
          titlePrefix={String(v.titlePrefix)}
        />
      )}
    />
  );
}

export function StatesMatrix({ derived }: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "label", label: "Visible label" },
        { id: "dot", label: "Dot with accessible name" },
        { id: "decorative", label: "Adjacent label" },
      ]}
      note="All deployment states come from the source union. These are label and announcement compositions, not sizes or control states. The decorative dot is hidden from assistive technology because the adjacent text names the state."
      render={(state, presentation) => (
        <Status presentation={presentation} state={state} titlePrefix="Production deployment" />
      )}
      rows={(derived.axes.state ?? []).map((state) => ({ id: state, label: state }))}
      rowsLabel="Deployment state"
    />
  );
}
