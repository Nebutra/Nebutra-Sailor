"use client";

import { Kbd } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

export function Playground(_: DemoProps) {
  const knobs: Knob[] = [
    { name: "children", label: "key", type: "text", defaultValue: "K" },
    { name: "small", type: "boolean", defaultValue: false },
    { name: "meta", type: "boolean", defaultValue: true },
    { name: "shift", type: "boolean", defaultValue: false },
    { name: "alt", type: "boolean", defaultValue: false },
    { name: "ctrl", type: "boolean", defaultValue: false },
  ];
  return (
    <ComponentPlayground
      caption="Kbd formats modifier props for the reader's platform and supplies an accessible key name. small is a boolean, not a size variant. The hint is display only; it does not register a shortcut."
      code={(v) =>
        snippet({
          imports: [{ names: ["Kbd"], from: "@nebutra/ui/primitives" }],
          body: jsx({
            name: "Kbd",
            props: { small: v.small, meta: v.meta, shift: v.shift, alt: v.alt, ctrl: v.ctrl },
            children: raw(JSON.stringify(String(v.children))),
          }),
        })
      }
      knobs={knobs}
      render={(v) => (
        <Kbd
          alt={Boolean(v.alt)}
          ctrl={Boolean(v.ctrl)}
          meta={Boolean(v.meta)}
          shift={Boolean(v.shift)}
          small={Boolean(v.small)}
        >
          {String(v.children)}
        </Kbd>
      )}
    />
  );
}

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "key", label: "Key" },
        { id: "meta", label: "Meta" },
        { id: "shift", label: "Shift" },
        { id: "alt", label: "Alt" },
        { id: "ctrl", label: "Control" },
        { id: "chord", label: "Meta + Shift" },
      ]}
      note="The source's small flag is crossed with its modifier props. Glyphs adapt to the platform; the accessible name spells out the chord. Kbd is not a control and has no focus, disabled or loading state."
      render={(size, modifier) => (
        <Kbd
          alt={modifier === "alt"}
          ctrl={modifier === "ctrl"}
          meta={modifier === "meta" || modifier === "chord"}
          shift={modifier === "shift" || modifier === "chord"}
          small={size === "small"}
        >
          K
        </Kbd>
      )}
      rows={[
        { id: "default", label: "Default" },
        { id: "small", label: "Small" },
      ]}
      rowsLabel="small prop"
    />
  );
}
