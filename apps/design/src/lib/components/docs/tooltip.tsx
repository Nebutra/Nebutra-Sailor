"use client";

import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

const SIDES = ["top", "right", "bottom", "left"] as const;
const KNOBS: Knob[] = [
  { name: "trigger", type: "text", defaultValue: "Retention" },
  { name: "content", type: "text", defaultValue: "Events remain available for 30 days" },
  { name: "side", type: "select", options: SIDES, defaultValue: "top" },
  { name: "align", type: "select", options: ["start", "center", "end"], defaultValue: "center" },
  { name: "delayDuration", type: "select", options: ["0", "300", "700"], defaultValue: "700" },
];

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="Hover or focus the trigger to read the hint. Placement may flip near a viewport edge; Escape dismisses it."
      code={(v) =>
        snippet({
          imports: [
            {
              names: ["Button", "Tooltip", "TooltipContent", "TooltipTrigger"],
              from: "@nebutra/ui/primitives",
            },
          ],
          body: jsx({
            name: "Tooltip",
            props: { delayDuration: Number(v.delayDuration) },
            children: [
              jsx({
                name: "TooltipTrigger",
                props: { asChild: true },
                children: [
                  jsx({
                    name: "Button",
                    props: {
                      variant: "outline",
                      className: "max-w-full whitespace-normal break-words",
                    },
                    children: String(v.trigger) || "Retention",
                  }),
                ],
              }),
              jsx({
                name: "TooltipContent",
                defaults: { side: "top", align: "center" },
                props: {
                  side: String(v.side),
                  align: String(v.align),
                  className: "max-w-64 break-words",
                },
                children: String(v.content),
              }),
            ],
          }),
        })
      }
      knobs={KNOBS}
      render={(v) => (
        <Tooltip delayDuration={Number(v.delayDuration)}>
          <TooltipTrigger asChild>
            <Button className="max-w-full whitespace-normal break-words" variant="outline">
              {String(v.trigger) || "Retention"}
            </Button>
          </TooltipTrigger>
          <TooltipContent
            align={v.align as "start" | "center" | "end"}
            className="max-w-64 break-words"
            side={v.side as (typeof SIDES)[number]}
          >
            {String(v.content)}
          </TooltipContent>
        </Tooltip>
      )}
    />
  );
}

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "short", label: "Short hint" },
        { id: "long", label: "Wrapped hint" },
      ]}
      note="Each hint opens only on hover or focus. These are live triggers, with no forced open, loading, or disabled tooltip state."
      render={(side, content) => (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button variant="outline">Retention</Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-64 break-words" side={side as (typeof SIDES)[number]}>
            {content === "short"
              ? "Available for 30 days"
              : "Events remain available for 30 days before they are automatically removed from this workspace"}
          </TooltipContent>
        </Tooltip>
      )}
      rows={SIDES.map((side) => ({ id: side, label: side }))}
      rowsLabel="Preferred side"
    />
  );
}
