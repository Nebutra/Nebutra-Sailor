"use client";

import { Scroller } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

const OVERFLOWS = ["x", "y", "both"] as const;
const STEPS = [
  "Queued",
  "Installing",
  "Building",
  "Linting",
  "Testing",
  "Packaging",
  "Scanning",
  "Deploying",
  "Verifying",
  "Ready",
  "Archived",
  "Closed",
];

type Overflow = (typeof OVERFLOWS)[number];

const ITEM_CLASS: Record<Overflow, string> = {
  x: "grid size-28 shrink-0 place-items-center rounded-md border border-border bg-muted text-sm",
  y: "flex h-12 shrink-0 items-center rounded-md border border-border bg-muted px-4 text-sm",
  both: "grid size-28 place-items-center rounded-md border border-border bg-muted text-sm",
};
const CONTAINER_CLASS: Record<Overflow, string> = {
  x: "gap-3",
  y: "gap-2",
  both: "grid grid-cols-[repeat(6,7rem)] gap-3",
};

function Items({ overflow, count }: { overflow: Overflow; count: number }) {
  return STEPS.slice(0, count).map((step) => (
    <div className={ITEM_CLASS[overflow]} key={step}>
      {step}
    </div>
  ));
}

const KNOBS: Knob[] = [
  { name: "overflow", type: "select", options: OVERFLOWS, defaultValue: "y" },
  { name: "height", type: "select", options: ["160", "240"], defaultValue: "160" },
  { name: "count", label: "items", type: "select", options: ["3", "12"], defaultValue: "12" },
  { name: "withButtons", type: "boolean", defaultValue: false },
  {
    name: "buttonAxis",
    type: "select",
    options: ["auto", "x", "y"],
    defaultValue: "auto",
    hint: "Auto means x for horizontal scrolling and y otherwise.",
  },
  { name: "edgeAffordance", type: "select", options: ["fade", "none"], defaultValue: "fade" },
  {
    name: "scrollBehavior",
    type: "select",
    options: ["smooth", "auto", "instant"],
    defaultValue: "smooth",
  },
  { name: "contentLabel", type: "text", defaultValue: "pipeline steps" },
];

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="Scroll the viewport, or switch withButtons on to step one item at a time. With three items nothing overflows, so there are no fades and the buttons stay hidden. Scroller has no disabled or loading state."
      code={(v) => {
        const overflow = v.overflow as Overflow;
        const item = jsx({
          name: "div",
          props: { className: ITEM_CLASS[overflow], key: raw("step") },
          children: raw("step"),
        });
        const body = jsx({
          name: "Scroller",
          defaults: {
            overflow: "y",
            withButtons: false,
            edgeAffordance: "fade",
            scrollBehavior: "smooth",
            contentLabel: "content",
          },
          props: {
            overflow,
            width: "100%",
            height: Number(v.height),
            withButtons: v.withButtons,
            buttonAxis: v.buttonAxis === "auto" ? undefined : String(v.buttonAxis),
            contentLabel: String(v.contentLabel),
            edgeAffordance: String(v.edgeAffordance),
            scrollBehavior: String(v.scrollBehavior),
            childrenContainerClassName: CONTAINER_CLASS[overflow],
          },
          children: [
            "{STEPS.map((step) => (",
            ...item.split("\n").map((line) => `  ${line}`),
            "))}",
          ],
        });
        return snippet({
          imports: [
            { names: ["Scroller"], from: "@nebutra/ui/primitives" },
            { names: ["type ReactElement"], from: "react" },
          ],
          body: `const STEPS = ${JSON.stringify(STEPS.slice(0, Number(v.count)))};\n\nexport function Pipeline(): ReactElement {\n  return (\n${body
            .split("\n")
            .map((line) => `    ${line}`)
            .join("\n")}\n  );\n}`,
        });
      }}
      knobs={KNOBS}
      render={(v) => {
        const overflow = v.overflow as Overflow;
        return (
          <div className="w-[28rem] max-w-full">
            <Scroller
              childrenContainerClassName={CONTAINER_CLASS[overflow]}
              contentLabel={String(v.contentLabel)}
              edgeAffordance={v.edgeAffordance as "fade" | "none"}
              height={Number(v.height)}
              overflow={overflow}
              scrollBehavior={v.scrollBehavior as ScrollBehavior}
              width="100%"
              withButtons={Boolean(v.withButtons)}
              {...present({
                buttonAxis: v.buttonAxis === "auto" ? undefined : (v.buttonAxis as "x" | "y"),
              })}
            >
              <Items count={Number(v.count)} overflow={overflow} />
            </Scroller>
          </div>
        );
      }}
    />
  );
}

const COLUMNS = [
  { id: "fade", label: "Fade edges" },
  { id: "none", label: "No edge affordance" },
  { id: "buttons", label: "With buttons" },
  { id: "fits", label: "Content fits" },
];

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      cellClassName="align-top"
      columns={COLUMNS}
      note="Every cell is a live scroller. Fades appear only on a side that has more content; buttons hide at the ends and are named from contentLabel. The component has no disabled, loading or error state."
      render={(row, column) => {
        const overflow = row as Overflow;
        return (
          <div className="w-60">
            <Scroller
              childrenContainerClassName={CONTAINER_CLASS[overflow]}
              contentLabel={`${row} ${column}`}
              edgeAffordance={column === "none" ? "none" : "fade"}
              height={120}
              overflow={overflow}
              width="100%"
              withButtons={column === "buttons"}
            >
              <Items count={column === "fits" ? 1 : STEPS.length} overflow={overflow} />
            </Scroller>
          </div>
        );
      }}
      rows={OVERFLOWS.map((overflow) => ({ id: overflow, label: overflow }))}
      rowsLabel="Overflow"
    />
  );
}
