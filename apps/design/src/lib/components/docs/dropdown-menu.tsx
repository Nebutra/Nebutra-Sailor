"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@nebutra/ui/primitives";
import { useState } from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

const KNOBS: Knob[] = [
  { name: "trigger", type: "text", defaultValue: "Project actions" },
  { name: "align", type: "select", options: ["start", "center", "end"], defaultValue: "start" },
  { name: "side", type: "select", options: ["top", "bottom"], defaultValue: "bottom" },
  { name: "disabledTrigger", type: "boolean", defaultValue: false },
  { name: "disableRename", type: "boolean", defaultValue: false },
  { name: "showCheckbox", type: "boolean", defaultValue: true },
  {
    name: "defaultChecked",
    type: "boolean",
    defaultValue: true,
    hint: "Initial preference when showCheckbox is enabled.",
  },
];

function LiveMenu({
  trigger,
  align,
  side,
  disabledTrigger,
  disableRename,
  showCheckbox,
  defaultChecked,
}: {
  trigger: string;
  align: "start" | "center" | "end";
  side: "top" | "bottom";
  disabledTrigger: boolean;
  disableRename: boolean;
  showCheckbox: boolean;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  const [action, setAction] = useState("No action selected.");
  return (
    <div className="grid max-w-full gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabledTrigger}>
          <Button
            className="max-w-full whitespace-normal break-words"
            disabled={disabledTrigger}
            variant="outline"
          >
            {trigger || "Project actions"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="max-w-[calc(100vw-2rem)]" side={side}>
          <DropdownMenuLabel>Project</DropdownMenuLabel>
          <DropdownMenuItem disabled={disableRename} onClick={() => setAction("Rename selected.")}>
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setAction("Duplicate selected.")}>
            Duplicate
          </DropdownMenuItem>
          {showCheckbox ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={checked} onCheckedChange={setChecked}>
                Show archived
              </DropdownMenuCheckboxItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <p aria-live="polite" className="text-muted-foreground">
        {action}
      </p>
      {showCheckbox ? (
        <p className="text-muted-foreground">Archived projects: {checked ? "shown" : "hidden"}</p>
      ) : null}
    </div>
  );
}

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="Menu actions update local feedback. The checkbox changes a local preference. Open the menu to test arrow keys, typeahead, and Escape."
      code={(v) => {
        const body = jsx({
          name: "div",
          props: { className: "grid max-w-full gap-3" },
          children: [
            jsx({
              name: "DropdownMenu",
              props: {},
              children: [
                jsx({
                  name: "DropdownMenuTrigger",
                  defaults: { disabled: false },
                  props: { asChild: true, disabled: v.disabledTrigger },
                  children: [
                    jsx({
                      name: "Button",
                      defaults: { disabled: false },
                      props: {
                        variant: "outline",
                        disabled: v.disabledTrigger,
                        className: "max-w-full whitespace-normal break-words",
                      },
                      children: String(v.trigger) || "Project actions",
                    }),
                  ],
                }),
                jsx({
                  name: "DropdownMenuContent",
                  defaults: { side: "bottom", align: "center" },
                  props: {
                    side: String(v.side),
                    align: String(v.align),
                    className: "max-w-[calc(100vw-2rem)]",
                  },
                  children: [
                    "<DropdownMenuLabel>Project</DropdownMenuLabel>",
                    jsx({
                      name: "DropdownMenuItem",
                      defaults: { disabled: false },
                      props: {
                        disabled: v.disableRename,
                        onClick: raw('() => setAction("Rename selected.")'),
                      },
                      children: "Rename",
                    }),
                    jsx({
                      name: "DropdownMenuItem",
                      props: { onClick: raw('() => setAction("Duplicate selected.")') },
                      children: "Duplicate",
                    }),
                    ...(v.showCheckbox
                      ? [
                          "<DropdownMenuSeparator />",
                          jsx({
                            name: "DropdownMenuCheckboxItem",
                            props: { checked: raw("checked"), onCheckedChange: raw("setChecked") },
                            children: "Show archived",
                          }),
                        ]
                      : []),
                  ],
                }),
              ],
            }),
            jsx({
              name: "p",
              props: { "aria-live": "polite", className: "text-muted-foreground" },
              children: raw("action"),
            }),
            ...(v.showCheckbox
              ? [
                  '<p className="text-muted-foreground">Archived projects: {checked ? "shown" : "hidden"}</p>',
                ]
              : []),
          ],
        });
        return `"use client";\n\n${snippet({
          imports: [
            {
              names: [
                "Button",
                "DropdownMenu",
                "DropdownMenuContent",
                "DropdownMenuItem",
                "DropdownMenuLabel",
                "DropdownMenuTrigger",
                ...(v.showCheckbox ? ["DropdownMenuCheckboxItem", "DropdownMenuSeparator"] : []),
              ],
              from: "@nebutra/ui/primitives",
            },
            { names: ["type ReactElement", "useState"], from: "react" },
          ],
          body: `export function ProjectMenu(): ReactElement {\n  const [action, setAction] = useState("No action selected.");\n${v.showCheckbox ? `  const [checked, setChecked] = useState(${Boolean(v.defaultChecked)});\n` : ""}  return (\n${body
            .split("\n")
            .map((line) => `    ${line}`)
            .join("\n")}\n  );\n}`,
        })}`;
      }}
      knobs={KNOBS}
      render={(v) => (
        <LiveMenu
          align={v.align as "start" | "center" | "end"}
          defaultChecked={Boolean(v.defaultChecked)}
          disabledTrigger={Boolean(v.disabledTrigger)}
          disableRename={Boolean(v.disableRename)}
          key={String(v.defaultChecked)}
          showCheckbox={Boolean(v.showCheckbox)}
          side={v.side as "top" | "bottom"}
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
        { id: "enabled", label: "Enabled items" },
        { id: "disabled-item", label: "Disabled item" },
        { id: "checked", label: "Checked preference" },
        { id: "disabled-trigger", label: "Disabled trigger" },
      ]}
      note="Open each enabled trigger to inspect the real menu. Actions and checkbox state are local to their cell. The disabled column disables the trigger, not the menu content."
      render={(align, state) => (
        <LiveMenu
          align={align as "start" | "center" | "end"}
          defaultChecked={state === "checked"}
          disabledTrigger={state === "disabled-trigger"}
          disableRename={state === "disabled-item"}
          showCheckbox
          side="bottom"
          trigger="Actions"
        />
      )}
      rows={[
        { id: "start", label: "Start" },
        { id: "center", label: "Center" },
        { id: "end", label: "End" },
      ]}
      rowsLabel="Alignment"
    />
  );
}
