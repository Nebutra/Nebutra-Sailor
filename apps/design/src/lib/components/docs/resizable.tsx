"use client";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@nebutra/ui/primitives";
import { useState } from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

const ORIENTATIONS = ["horizontal", "vertical"] as const;
const FIRST_SIZES = ["25%", "40%", "60%"] as const;
const MIN_SIZES = ["10%", "20%", "30%"] as const;

type Orientation = (typeof ORIENTATIONS)[number];

const KNOBS: Knob[] = [
  { name: "orientation", type: "select", options: ORIENTATIONS, defaultValue: "horizontal" },
  {
    name: "firstSize",
    label: "defaultSize (first)",
    type: "select",
    options: FIRST_SIZES,
    defaultValue: "40%",
  },
  {
    name: "minSize",
    label: "minSize (first)",
    type: "select",
    options: MIN_SIZES,
    defaultValue: "20%",
  },
  {
    name: "collapsible",
    type: "boolean",
    defaultValue: false,
    hint: "Drag the first panel below its minSize, or press Enter on the handle.",
  },
  { name: "withHandle", type: "boolean", defaultValue: true },
  { name: "disabled", label: "disabled (handle)", type: "boolean", defaultValue: false },
];

function LiveSplit({
  orientation,
  firstSize,
  minSize,
  collapsible,
  withHandle,
  disabled,
}: {
  orientation: Orientation;
  firstSize: string;
  minSize: string;
  collapsible: boolean;
  withHandle: boolean;
  disabled: boolean;
}) {
  const [size, setSize] = useState<number | null>(null);
  return (
    <div className="grid w-[28rem] max-w-full gap-3">
      <ResizablePanelGroup
        className="h-56 w-full rounded-lg border border-border"
        // defaultSize is read once on mount, so a changed knob remounts the group.
        key={`${orientation}-${firstSize}-${minSize}-${collapsible}`}
        orientation={orientation}
      >
        <ResizablePanel
          collapsible={collapsible}
          defaultSize={firstSize}
          minSize={minSize}
          onResize={(next) => setSize(next.asPercentage)}
        >
          <div className="flex h-full items-center justify-center p-4 text-muted-foreground">
            Navigation
          </div>
        </ResizablePanel>
        <ResizableHandle
          aria-label="Resize navigation"
          disabled={disabled}
          withHandle={withHandle}
        />
        <ResizablePanel defaultSize={`${100 - Number.parseInt(firstSize, 10)}%`}>
          <div className="flex h-full items-center justify-center p-4">Content</div>
        </ResizablePanel>
      </ResizablePanelGroup>
      <p aria-live="off" className="text-muted-foreground">
        First panel: {size === null ? firstSize : `${Math.round(size)}%`}
      </p>
    </div>
  );
}

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="Drag the divider, or Tab to it and use the arrow keys. The size readout under the group is preview-only and not part of the snippet. Numbers are pixels in react-resizable-panels v4, so sizes here are percentage strings."
      code={(v) => {
        const firstSize = String(v.firstSize);
        return snippet({
          imports: [
            {
              names: ["ResizableHandle", "ResizablePanel", "ResizablePanelGroup"],
              from: "@nebutra/ui/primitives",
            },
          ],
          body: jsx({
            name: "ResizablePanelGroup",
            defaults: { orientation: "horizontal" },
            props: {
              orientation: String(v.orientation),
              className: "h-56 w-full rounded-lg border border-border",
            },
            children: [
              jsx({
                name: "ResizablePanel",
                defaults: { collapsible: false },
                props: {
                  defaultSize: firstSize,
                  minSize: String(v.minSize),
                  collapsible: v.collapsible,
                },
                children: [
                  jsx({
                    name: "div",
                    props: {
                      className:
                        "flex h-full items-center justify-center p-4 text-muted-foreground",
                    },
                    children: "Navigation",
                  }),
                ],
              }),
              jsx({
                name: "ResizableHandle",
                defaults: { withHandle: false, disabled: false },
                props: {
                  "aria-label": "Resize navigation",
                  withHandle: v.withHandle,
                  disabled: v.disabled,
                },
              }),
              jsx({
                name: "ResizablePanel",
                props: { defaultSize: `${100 - Number.parseInt(firstSize, 10)}%` },
                children: [
                  jsx({
                    name: "div",
                    props: { className: "flex h-full items-center justify-center p-4" },
                    children: "Content",
                  }),
                ],
              }),
            ],
          }),
        });
      }}
      knobs={KNOBS}
      render={(v) => (
        <LiveSplit
          collapsible={Boolean(v.collapsible)}
          disabled={Boolean(v.disabled)}
          firstSize={String(v.firstSize)}
          minSize={String(v.minSize)}
          orientation={v.orientation as Orientation}
          withHandle={Boolean(v.withHandle)}
        />
      )}
    />
  );
}

const COLUMNS = [
  { id: "default", label: "Default" },
  { id: "grip", label: "With grip" },
  { id: "constrained", label: "Min 30% / max 70%" },
  { id: "collapsible", label: "Collapsible" },
  { id: "disabled", label: "Disabled handle" },
];

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      cellClassName="align-top"
      columns={COLUMNS}
      note="Every cell is a live two-panel group; drag it, or Tab to the divider and use the arrow keys. The group has no loading, error or empty state of its own: panel content owns those. Disabled removes the divider from the tab order."
      render={(orientation, column) => (
        <ResizablePanelGroup
          className="h-24 w-56 rounded-lg border border-border"
          orientation={orientation as Orientation}
        >
          <ResizablePanel
            collapsible={column === "collapsible"}
            defaultSize="50%"
            maxSize={column === "constrained" ? "70%" : "100%"}
            minSize={column === "constrained" ? "30%" : column === "collapsible" ? "25%" : "0%"}
          >
            <div className="flex h-full items-center justify-center text-muted-foreground">A</div>
          </ResizablePanel>
          <ResizableHandle
            aria-label={`Resize ${orientation} ${column}`}
            disabled={column === "disabled"}
            withHandle={column === "grip"}
          />
          <ResizablePanel defaultSize="50%">
            <div className="flex h-full items-center justify-center">B</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
      rows={ORIENTATIONS.map((orientation) => ({ id: orientation, label: orientation }))}
      rowsLabel="Orientation"
    />
  );
}
