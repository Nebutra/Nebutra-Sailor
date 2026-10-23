"use client";

import { AspectRatio, Skeleton } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

const RATIOS = ["1 / 1", "4 / 3", "16 / 9", "21 / 9", "3 / 4"] as const;
const FILLER =
  "Content that is taller than the frame is not clipped by the ratio: the box grows to hold it.";

/** `"16 / 9"` → 1.777…; the label is also the expression written into the snippet. */
function ratioOf(label: string): number {
  const [width, height] = label.split("/").map((part) => Number(part.trim()));
  return width && height ? width / height : 1;
}

const KNOBS: Knob[] = [
  { name: "ratio", type: "select", options: RATIOS, defaultValue: "16 / 9" },
  {
    name: "clip",
    type: "boolean",
    defaultValue: true,
    hint: "Adds overflow-hidden and a corner radius to the frame.",
  },
  {
    name: "content",
    type: "select",
    options: ["fill", "overflowing"],
    defaultValue: "fill",
    hint: "fill is absolutely positioned; overflowing sits in normal flow.",
  },
];

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="AspectRatio only reserves the box. Children are not stretched: fill them with absolute inset-0, and note that content taller than the frame grows it unless the frame clips."
      code={(v) => {
        const label = String(v.ratio);
        const fill = v.content === "fill";
        return snippet({
          imports: [{ names: ["AspectRatio"], from: "@nebutra/ui/primitives" }],
          body: jsx({
            name: "AspectRatio",
            props: {
              className: v.clip ? "overflow-hidden rounded-lg bg-muted" : "bg-muted",
              ratio: label === "1 / 1" ? undefined : raw(label),
            },
            children: [
              fill
                ? jsx({
                    name: "div",
                    props: { className: "absolute inset-0 flex items-center justify-center" },
                    children: label,
                  })
                : jsx({ name: "div", props: { className: "p-4 text-sm" }, children: FILLER }),
            ],
          }),
        });
      }}
      knobs={KNOBS}
      render={(v) => (
        <div className="w-64 max-w-full">
          <AspectRatio
            className={v.clip ? "overflow-hidden rounded-lg bg-muted" : "bg-muted"}
            ratio={ratioOf(String(v.ratio))}
          >
            {v.content === "fill" ? (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                {String(v.ratio)}
              </div>
            ) : (
              <div className="p-4 text-sm">{FILLER}</div>
            )}
          </AspectRatio>
        </div>
      )}
    />
  );
}

const COLUMNS = [
  { id: "empty", label: "Empty" },
  { id: "filled", label: "Filled" },
  { id: "loading", label: "Loading" },
  { id: "grows", label: "Taller content" },
  { id: "clipped", label: "Taller, clipped" },
];

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={COLUMNS}
      note="AspectRatio is a frame: it has no disabled, error or focus state of its own. The columns are what you put in it. Loading is a Skeleton filling the frame, so the box is the same size before and after the media arrives."
      render={(label, column) => (
        <div className="w-36">
          <AspectRatio
            className={column === "clipped" ? "overflow-hidden bg-muted" : "bg-muted"}
            ratio={ratioOf(label)}
          >
            {column === "filled" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent to-muted text-muted-foreground text-xs">
                {label}
              </div>
            ) : null}
            {column === "loading" ? (
              <Skeleton className="absolute inset-0" height="100%" width="100%" />
            ) : null}
            {column === "grows" || column === "clipped" ? (
              <div className="p-2 text-xs">{FILLER}</div>
            ) : null}
          </AspectRatio>
        </div>
      )}
      rows={RATIOS.map((label) => ({ id: label, label }))}
      rowsLabel="Ratio"
    />
  );
}
