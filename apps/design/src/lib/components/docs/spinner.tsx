"use client";

import { Spinner } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

function frameClass(tone: string) {
  return tone === "inverse"
    ? "inline-flex items-center rounded-md bg-primary p-4"
    : "inline-flex items-center rounded-md p-4";
}

export function Playground({ derived }: DemoProps) {
  const knobs: Knob[] = [
    { name: "size", type: "select", options: derived.axes.size ?? [], defaultValue: "md" },
    { name: "tone", type: "select", options: derived.axes.tone ?? [], defaultValue: "default" },
    { name: "label", type: "text", defaultValue: "Loading deployment" },
    { name: "decorative", type: "boolean", defaultValue: false },
    {
      name: "immediate",
      type: "boolean",
      defaultValue: true,
      hint: "Turn off to see the source's delayed paint on a fresh mount.",
    },
  ];
  return (
    <ComponentPlayground
      caption="Sizes and tones come from the token maps. inverse sits on a primary fill. A label gives Spinner status semantics; decorative silences it when the surrounding context carries the status. Legacy variant names all render the same spinner."
      code={(v) =>
        snippet({
          imports: [{ names: ["Spinner"], from: "@nebutra/ui/primitives" }],
          body: jsx({
            name: "div",
            props: { className: frameClass(String(v.tone)) },
            children: [
              jsx({
                name: "Spinner",
                defaults: { size: "md", tone: "default", immediate: false },
                props: {
                  size: String(v.size),
                  tone: String(v.tone),
                  label: String(v.label) || undefined,
                  decorative: v.decorative ? true : undefined,
                  immediate: v.immediate,
                },
              }),
            ],
          }),
        })
      }
      knobs={knobs}
      render={(v) => (
        <div className={frameClass(String(v.tone))}>
          <Spinner
            immediate={Boolean(v.immediate)}
            key={JSON.stringify(v)}
            size={v.size as never}
            tone={v.tone as never}
            {...present({
              decorative: v.decorative ? true : undefined,
              label: String(v.label) || undefined,
            })}
          />
        </div>
      )}
    />
  );
}

export function StatesMatrix({ derived }: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={(derived.axes.tone ?? []).map((tone) => ({ id: tone, label: tone }))}
      note="Source size tokens cross source tones. immediate keeps these intentional specimens visible without the pending delay. The single spinner has no disabled, empty or error mode; deprecated variants do not create visual alternatives."
      render={(size, tone) => (
        <div className={frameClass(tone)}>
          <Spinner immediate label="Loading deployment" size={size as never} tone={tone as never} />
        </div>
      )}
      rows={(derived.axes.size ?? []).map((size) => ({ id: size, label: size }))}
      rowsLabel="Size"
    />
  );
}
