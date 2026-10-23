"use client";

import {
  Button,
  Input,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@nebutra/ui/primitives";
import { useId } from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

const SIDES = ["top", "right", "bottom", "left"] as const;
type Side = (typeof SIDES)[number];

const MODALS = ["trap-focus", "true", "false"] as const;

const KNOBS: Knob[] = [
  { name: "trigger", type: "text", defaultValue: "Edit project" },
  { name: "title", type: "text", defaultValue: "Edit project" },
  { name: "description", type: "text", defaultValue: "Changes apply when you save." },
  { name: "side", type: "select", options: SIDES, defaultValue: "right" },
  { name: "modal", type: "select", options: MODALS, defaultValue: "trap-focus" },
  {
    name: "disablePointerDismissal",
    type: "boolean",
    defaultValue: true,
    hint: "On by default: a click on the backdrop does not close the sheet.",
  },
  { name: "showClose", type: "boolean", defaultValue: true },
  { name: "closeLabel", type: "text", defaultValue: "Close" },
  { name: "noOverlay", type: "boolean", defaultValue: false },
  { name: "showInput", type: "boolean", defaultValue: true },
  { name: "showFooter", type: "boolean", defaultValue: true },
];

// The modal prop takes a boolean or the string "trap-focus"; a select knob only carries strings.
function modalOf(value: string): boolean | "trap-focus" {
  return value === "trap-focus" ? "trap-focus" : value === "true";
}

function LiveSheet({
  trigger,
  title,
  description,
  side,
  modal,
  disablePointerDismissal,
  showClose,
  closeLabel,
  noOverlay,
  showInput,
  showFooter,
}: {
  trigger: string;
  title: string;
  description: string;
  side: Side;
  modal: string;
  disablePointerDismissal: boolean;
  showClose: boolean;
  closeLabel: string;
  noOverlay: boolean;
  showInput: boolean;
  showFooter: boolean;
}) {
  const id = useId();
  return (
    <Sheet disablePointerDismissal={disablePointerDismissal} modal={modalOf(modal)}>
      <SheetTrigger asChild>
        <Button className="max-w-full whitespace-normal break-words" variant="outline">
          {trigger || "Edit project"}
        </Button>
      </SheetTrigger>
      <SheetContent
        className="break-words"
        closeLabel={closeLabel || "Close"}
        noOverlay={noOverlay}
        showClose={showClose}
        side={side}
      >
        <SheetHeader>
          <SheetTitle>{title || "Edit project"}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        {showInput ? (
          <SheetBody>
            <Input defaultValue="acme-web" id={`${id}-name`} label="Project name" />
          </SheetBody>
        ) : null}
        {showFooter ? (
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
            <SheetClose asChild>
              <Button>Save</Button>
            </SheetClose>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="The sheet slides in from the chosen edge. Tab stays inside it and Escape closes it. By default the backdrop does not, so turn disablePointerDismissal off to try that."
      code={(v) => {
        const description = String(v.description);
        const names = [
          "Button",
          "Sheet",
          "SheetContent",
          "SheetHeader",
          "SheetTitle",
          "SheetTrigger",
          ...(description ? ["SheetDescription"] : []),
          ...(v.showInput ? ["Input", "SheetBody"] : []),
          ...(v.showFooter ? ["SheetClose", "SheetFooter"] : []),
        ];

        const header = jsx({
          name: "SheetHeader",
          props: {},
          children: [
            jsx({ name: "SheetTitle", props: {}, children: String(v.title) || "Edit project" }),
            ...(description
              ? [jsx({ name: "SheetDescription", props: {}, children: description })]
              : []),
          ],
        });
        const footer = jsx({
          name: "SheetFooter",
          props: {},
          children: [
            jsx({
              name: "SheetClose",
              props: { asChild: true },
              children: [
                jsx({ name: "Button", props: { variant: "outline" }, children: "Cancel" }),
              ],
            }),
            jsx({
              name: "SheetClose",
              props: { asChild: true },
              children: [jsx({ name: "Button", props: {}, children: "Save" })],
            }),
          ],
        });

        return snippet({
          imports: [{ names, from: "@nebutra/ui/primitives" }],
          body: jsx({
            name: "Sheet",
            defaults: { modal: "trap-focus", disablePointerDismissal: true },
            props: {
              modal: modalOf(String(v.modal)),
              disablePointerDismissal: v.disablePointerDismissal,
            },
            children: [
              jsx({
                name: "SheetTrigger",
                props: { asChild: true },
                children: [
                  jsx({
                    name: "Button",
                    props: {
                      variant: "outline",
                      className: "max-w-full whitespace-normal break-words",
                    },
                    children: String(v.trigger) || "Edit project",
                  }),
                ],
              }),
              jsx({
                name: "SheetContent",
                defaults: { side: "right", showClose: true, closeLabel: "Close", noOverlay: false },
                props: {
                  side: String(v.side),
                  showClose: v.showClose,
                  closeLabel: String(v.closeLabel) || "Close",
                  noOverlay: v.noOverlay,
                  className: "break-words",
                },
                children: [
                  header,
                  ...(v.showInput
                    ? [
                        jsx({
                          name: "SheetBody",
                          props: {},
                          children: [
                            jsx({
                              name: "Input",
                              props: {
                                id: "name",
                                label: "Project name",
                                defaultValue: "acme-web",
                              },
                            }),
                          ],
                        }),
                      ]
                    : []),
                  ...(v.showFooter ? [footer] : []),
                ],
              }),
            ],
          }),
        });
      }}
      knobs={KNOBS}
      render={(v) => (
        <LiveSheet
          closeLabel={String(v.closeLabel)}
          description={String(v.description)}
          disablePointerDismissal={Boolean(v.disablePointerDismissal)}
          modal={String(v.modal)}
          noOverlay={Boolean(v.noOverlay)}
          showClose={Boolean(v.showClose)}
          showFooter={Boolean(v.showFooter)}
          showInput={Boolean(v.showInput)}
          side={v.side as Side}
          title={String(v.title)}
          trigger={String(v.trigger)}
        />
      )}
    />
  );
}

// One closed sheet per cell; the panel mounts in a portal only when its trigger is pressed.
function SheetCell({ side, kind }: { side: Side; kind: string }) {
  const id = useId();
  const form = kind === "form" || kind === "saving";
  const saving = kind === "saving";
  return (
    <Sheet>
      <SheetTrigger asChild disabled={kind === "disabled"}>
        <Button disabled={kind === "disabled"} size="sm" variant="outline">
          Open {side}
        </Button>
      </SheetTrigger>
      <SheetContent noOverlay={kind === "no-overlay"} showClose={kind !== "no-close"} side={side}>
        <SheetHeader>
          <SheetTitle>Edit project</SheetTitle>
          <SheetDescription>Changes apply when you save.</SheetDescription>
        </SheetHeader>
        {form ? (
          <SheetBody>
            <Input
              defaultValue="acme-web"
              disabled={saving}
              id={`${id}-name`}
              label="Project name"
            />
          </SheetBody>
        ) : null}
        {kind === "default" ? null : (
          <SheetFooter>
            <SheetClose asChild>
              <Button disabled={saving} variant="outline">
                Cancel
              </Button>
            </SheetClose>
            <SheetClose asChild>
              <Button loading={saving}>{form ? "Save" : "Done"}</Button>
            </SheetClose>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "default", label: "Default" },
        { id: "form", label: "Form + footer" },
        { id: "saving", label: "Saving" },
        { id: "no-close", label: "No close button" },
        { id: "no-overlay", label: "No overlay" },
        { id: "disabled", label: "Disabled trigger" },
      ]}
      note="Every cell opens its own real sheet on demand. Sheet has no loading, invalid or empty state of its own: Saving shows a pending Button and disabled field inside it, and Escape still closes that sheet unless the page controls open. The disabled column disables the trigger, not the panel."
      render={(side, kind) => <SheetCell kind={kind} side={side as Side} />}
      rows={SIDES.map((side) => ({ id: side, label: side }))}
      rowsLabel="Side"
    />
  );
}
