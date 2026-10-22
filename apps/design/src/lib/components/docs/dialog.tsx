"use client";

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
} from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

const KNOBS: Knob[] = [
  { name: "title", type: "text", defaultValue: "Delete workspace" },
  {
    name: "description",
    type: "text",
    defaultValue: "This is permanent. Archive it instead if you may need it back.",
  },
  { name: "confirm", type: "text", defaultValue: "Delete" },
  { name: "destructive", type: "boolean", defaultValue: true },
  { name: "showCancel", type: "boolean", defaultValue: true },
  { name: "showInput", type: "boolean", defaultValue: false, hint: "Adds a field to the body." },
];

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="The dialog opens over the page. Tab stays inside it, Esc closes it, and focus returns to the trigger."
      code={(v) => {
        const title = String(v.title);
        const description = String(v.description);
        const names = [
          "Button",
          "Dialog",
          "DialogClose",
          "DialogContent",
          ...(description ? ["DialogDescription"] : []),
          "DialogFooter",
          "DialogHeader",
          "DialogTitle",
          "DialogTrigger",
          ...(v.showInput ? ["Input"] : []),
        ];

        const header = jsx({
          name: "DialogHeader",
          props: {},
          children: [
            jsx({ name: "DialogTitle", props: {}, children: title }),
            ...(description
              ? [jsx({ name: "DialogDescription", props: {}, children: description })]
              : []),
          ],
        });
        const confirm = jsx({
          name: "Button",
          defaults: { variant: "default" },
          props: { variant: v.destructive ? "destructive" : "default" },
          children: String(v.confirm),
        });
        const footer = jsx({
          name: "DialogFooter",
          props: {},
          children: [
            ...(v.showCancel
              ? [
                  jsx({
                    name: "DialogClose",
                    props: { asChild: true },
                    children: [
                      jsx({ name: "Button", props: { variant: "outline" }, children: "Cancel" }),
                    ],
                  }),
                ]
              : []),
            jsx({ name: "DialogClose", props: { asChild: true }, children: [confirm] }),
          ],
        });

        return snippet({
          imports: [{ names, from: "@nebutra/ui/primitives" }],
          body: jsx({
            name: "Dialog",
            props: {},
            children: [
              jsx({
                name: "DialogTrigger",
                props: { asChild: true },
                children: [
                  jsx({ name: "Button", props: { variant: "outline" }, children: "Open dialog" }),
                ],
              }),
              jsx({
                name: "DialogContent",
                props: {},
                children: [
                  header,
                  ...(v.showInput
                    ? [jsx({ name: "Input", props: { id: "name", label: "Workspace name" } })]
                    : []),
                  footer,
                ],
              }),
            ],
          }),
        });
      }}
      knobs={KNOBS}
      render={(v) => (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{String(v.title)}</DialogTitle>
              {String(v.description) ? (
                <DialogDescription>{String(v.description)}</DialogDescription>
              ) : null}
            </DialogHeader>
            {v.showInput ? (
              <div className="py-2">
                <Input id="playground-dialog-name" label="Workspace name" />
              </div>
            ) : null}
            <DialogFooter>
              {v.showCancel ? (
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
              ) : null}
              <DialogClose asChild>
                <Button variant={v.destructive ? "destructive" : "default"}>
                  {String(v.confirm)}
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    />
  );
}

const ROWS = [
  { id: "default", label: "Confirm" },
  { id: "destructive", label: "Destructive" },
];

const COLUMNS = [
  { id: "idle", label: "Idle" },
  { id: "submitting", label: "Submitting" },
  { id: "disabled", label: "Disabled" },
];

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={COLUMNS}
      note={
        <>
          A modal cannot sit in a grid, so this shows the part that changes: the footer buttons
          across the states a dialog passes through. Open the playground above for the full panel.
        </>
      }
      render={(row, column) => (
        <DialogFooter className="sm:space-x-0 sm:gap-2">
          <Button disabled={column !== "idle"} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={column === "disabled"}
            loading={column === "submitting"}
            variant={row === "destructive" ? "destructive" : "default"}
          >
            {row === "destructive" ? "Delete" : "Confirm"}
          </Button>
        </DialogFooter>
      )}
      rows={ROWS}
      rowsLabel="Confirm button"
    />
  );
}
