"use client";

import { Button, Input, Popover, PopoverContent, PopoverTrigger } from "@nebutra/ui/primitives";
import { useId, useState } from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

const SIDES = ["top", "right", "bottom", "left"] as const;
const KNOBS: Knob[] = [
  { name: "trigger", type: "text", defaultValue: "Project settings" },
  { name: "heading", type: "text", defaultValue: "Project settings" },
  { name: "description", type: "text", defaultValue: "Changes stay in this preview." },
  { name: "side", type: "select", options: SIDES, defaultValue: "bottom" },
  { name: "align", type: "select", options: ["start", "center", "end"], defaultValue: "center" },
  { name: "showArrow", type: "boolean", defaultValue: false },
  { name: "showInput", type: "boolean", defaultValue: true },
];

function LivePopover({
  trigger,
  heading,
  description,
  side,
  align,
  showArrow,
  showInput,
}: {
  trigger: string;
  heading: string;
  description: string;
  side: (typeof SIDES)[number];
  align: "start" | "center" | "end";
  showArrow: boolean;
  showInput: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button className="max-w-full whitespace-normal break-words" variant="outline">
          {trigger || "Project settings"}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        aria-labelledby={`${id}-heading`}
        className="grid w-72 max-w-[calc(100vw-2rem)] gap-3 break-words"
        showArrow={showArrow}
        side={side}
      >
        <p id={`${id}-heading`}>{heading || "Project settings"}</p>
        {description ? <p className="text-muted-foreground">{description}</p> : null}
        {showInput ? (
          <Input defaultValue="acme-web" id={`${id}-name`} label="Project name" />
        ) : null}
        <Button onClick={() => setOpen(false)} variant="outline">
          Close
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="Open the anchored panel, edit the local field, then close it with the button, Escape, or an outside press."
      code={(v) => {
        const body = jsx({
          name: "Popover",
          props: { open: raw("open"), onOpenChange: raw("setOpen") },
          children: [
            jsx({
              name: "PopoverTrigger",
              props: { asChild: true },
              children: [
                jsx({
                  name: "Button",
                  props: {
                    variant: "outline",
                    className: "max-w-full whitespace-normal break-words",
                  },
                  children: String(v.trigger) || "Project settings",
                }),
              ],
            }),
            jsx({
              name: "PopoverContent",
              defaults: { side: "bottom", align: "center", showArrow: false },
              props: {
                side: String(v.side),
                align: String(v.align),
                showArrow: v.showArrow,
                "aria-labelledby": raw('id + "-heading"'),
                className: "grid w-72 max-w-[calc(100vw-2rem)] gap-3 break-words",
              },
              children: [
                jsx({
                  name: "p",
                  props: { id: raw('id + "-heading"') },
                  children: String(v.heading) || "Project settings",
                }),
                ...(v.description
                  ? [
                      jsx({
                        name: "p",
                        props: { className: "text-muted-foreground" },
                        children: String(v.description),
                      }),
                    ]
                  : []),
                ...(v.showInput
                  ? [
                      jsx({
                        name: "Input",
                        props: {
                          id: raw('id + "-name"'),
                          label: "Project name",
                          defaultValue: "acme-web",
                        },
                      }),
                    ]
                  : []),
                jsx({
                  name: "Button",
                  props: { variant: "outline", onClick: raw("() => setOpen(false)") },
                  children: "Close",
                }),
              ],
            }),
          ],
        });
        return `"use client";\n\n${snippet({
          imports: [
            {
              names: [
                "Button",
                "Popover",
                "PopoverContent",
                "PopoverTrigger",
                ...(v.showInput ? ["Input"] : []),
              ],
              from: "@nebutra/ui/primitives",
            },
            { names: ["type ReactElement", "useId", "useState"], from: "react" },
          ],
          body: `export function ProjectPopover(): ReactElement {\n  const id = useId();\n  const [open, setOpen] = useState(false);\n  return (\n${body
            .split("\n")
            .map((line) => `    ${line}`)
            .join("\n")}\n  );\n}`,
        })}`;
      }}
      knobs={KNOBS}
      render={(v) => (
        <LivePopover
          align={v.align as "start" | "center" | "end"}
          description={String(v.description)}
          heading={String(v.heading)}
          showArrow={Boolean(v.showArrow)}
          showInput={Boolean(v.showInput)}
          side={v.side as (typeof SIDES)[number]}
          trigger={String(v.trigger)}
        />
      )}
    />
  );
}

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "plain", label: "Plain panel" },
        { id: "arrow", label: "With arrow" },
        { id: "form", label: "With field" },
      ]}
      note="Every cell opens a separate panel on demand. Each panel has local open state and unique label and field IDs; preferred placement may flip to stay in the viewport."
      render={(side, content) => (
        <LivePopover
          align="center"
          description="Changes stay in this preview."
          heading="Project settings"
          showArrow={content === "arrow"}
          showInput={content === "form"}
          side={side as (typeof SIDES)[number]}
          trigger="Open panel"
        />
      )}
      rows={SIDES.map((side) => ({ id: side, label: side }))}
      rowsLabel="Preferred side"
    />
  );
}
