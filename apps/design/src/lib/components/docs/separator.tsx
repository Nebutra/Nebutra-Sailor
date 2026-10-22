"use client";

import { Separator } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

const ORIENTATIONS = ["horizontal", "vertical"] as const;

function frameClass(orientation: string) {
  return orientation === "vertical"
    ? "flex h-16 w-64 max-w-full items-center gap-3 text-foreground text-sm"
    : "flex w-64 max-w-full flex-col gap-3 text-foreground text-sm";
}

function Rule({ orientation, hidden }: { orientation: string; hidden: boolean }) {
  return (
    <div className={frameClass(orientation)}>
      <span>Production</span>
      <Separator
        orientation={orientation as never}
        {...present({ "aria-hidden": hidden ? ("true" as const) : undefined })}
      />
      <span>Preview</span>
    </div>
  );
}

export function Playground({ derived }: DemoProps) {
  const knobs: Knob[] = [
    {
      name: "orientation",
      type: "select",
      options: derived.axes.orientation?.length ? derived.axes.orientation : ORIENTATIONS,
      defaultValue: "horizontal",
    },
    {
      name: "ariaHidden",
      label: "aria-hidden (visual only)",
      type: "boolean",
      defaultValue: true,
    },
  ];
  return (
    <ComponentPlayground
      caption="A vertical rule needs a parent with a height. The wrapper currently consumes decorative without forwarding it, so use aria-hidden for a visual-only rule. Otherwise Base UI exposes separator semantics."
      code={(v) =>
        snippet({
          imports: [{ names: ["Separator"], from: "@nebutra/ui/primitives" }],
          body: jsx({
            name: "div",
            props: { className: frameClass(String(v.orientation)) },
            children: [
              "<span>Production</span>",
              jsx({
                name: "Separator",
                defaults: { orientation: "horizontal" },
                props: {
                  orientation: String(v.orientation),
                  "aria-hidden": v.ariaHidden ? "true" : undefined,
                },
              }),
              "<span>Preview</span>",
            ],
          }),
        })
      }
      knobs={knobs}
      render={(v) => <Rule hidden={Boolean(v.ariaHidden)} orientation={String(v.orientation)} />}
    />
  );
}

export function StatesMatrix({ derived }: DemoProps) {
  const orientations = derived.axes.orientation?.length ? derived.axes.orientation : ORIENTATIONS;
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "structural", label: "Structural separator" },
        { id: "visual", label: "Visual only (aria-hidden)" },
      ]}
      note="Orientation and accessibility exposure are the meaningful axes. Vertical examples have an explicit parent height. The visual-only column uses aria-hidden; it does not rely on the currently ignored decorative compatibility prop."
      render={(orientation, column) => (
        <Rule hidden={column === "visual"} orientation={orientation} />
      )}
      rows={orientations.map((orientation) => ({ id: orientation, label: orientation }))}
      rowsLabel="Orientation"
    />
  );
}
