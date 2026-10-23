"use client";

import { ChevronDown } from "@nebutra/icons";
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@nebutra/ui/primitives";
import { useState } from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

const PLAIN_TRIGGER =
  "text-sm font-medium underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50";
const LIST = "mt-2 grid gap-2 break-words text-muted-foreground text-sm";
const ROW = "rounded-md border border-border px-3 py-2";
const PACKAGES = ["@nebutra/ui", "@nebutra/tokens", "@nebutra/icons"];

const KNOBS: Knob[] = [
  { name: "trigger", type: "text", defaultValue: "3 packages" },
  { name: "defaultOpen", type: "boolean", defaultValue: false },
  { name: "disabled", type: "boolean", defaultValue: false },
  {
    name: "asChild",
    label: "asChild (Button)",
    type: "boolean",
    defaultValue: true,
    hint: "Off renders the bare button the component ships with.",
  },
];

function PackageList() {
  return (
    <ul className={LIST}>
      {PACKAGES.map((name) => (
        <li className={ROW} key={name}>
          {name}
        </li>
      ))}
    </ul>
  );
}

/** Mirrors the open state into a readout so onOpenChange has something to show. */
function LiveCollapsible({
  trigger,
  defaultOpen,
  disabled,
  asChild,
}: {
  trigger: string;
  defaultOpen: boolean;
  disabled: boolean;
  asChild: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const label = trigger || "3 packages";
  return (
    <Collapsible
      className="w-72 max-w-full"
      defaultOpen={defaultOpen}
      disabled={disabled}
      onOpenChange={setOpen}
    >
      {asChild ? (
        <CollapsibleTrigger asChild>
          <Button
            className="max-w-full whitespace-normal break-words"
            suffix={<ChevronDown />}
            variant="outline"
          >
            {label}
          </Button>
        </CollapsibleTrigger>
      ) : (
        <CollapsibleTrigger className={PLAIN_TRIGGER}>{label}</CollapsibleTrigger>
      )}
      <CollapsibleContent>
        <PackageList />
      </CollapsibleContent>
      <p aria-live="polite" className="mt-2 text-muted-foreground text-xs">
        State: {open ? "open" : "closed"}
      </p>
    </Collapsible>
  );
}

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="The trigger toggles the region; the readout under it follows onOpenChange (it is not part of the snippet). Closed content is removed from the DOM. Changing defaultOpen remounts the example."
      code={(v) =>
        snippet({
          imports: [
            {
              names: ["Collapsible", "CollapsibleContent", "CollapsibleTrigger"],
              from: "@nebutra/ui/primitives",
            },
            ...(v.asChild ? [{ names: ["Button"], from: "@nebutra/ui/primitives" }] : []),
            ...(v.asChild ? [{ names: ["ChevronDown"], from: "@nebutra/icons" }] : []),
          ],
          body: jsx({
            name: "Collapsible",
            defaults: { defaultOpen: false, disabled: false },
            props: { defaultOpen: v.defaultOpen, disabled: v.disabled },
            children: [
              v.asChild
                ? jsx({
                    name: "CollapsibleTrigger",
                    props: { asChild: true },
                    children: [
                      jsx({
                        name: "Button",
                        props: {
                          variant: "outline",
                          suffix: raw("<ChevronDown />"),
                          className: "max-w-full whitespace-normal break-words",
                        },
                        children: String(v.trigger) || "3 packages",
                      }),
                    ],
                  })
                : jsx({
                    name: "CollapsibleTrigger",
                    props: { className: PLAIN_TRIGGER },
                    children: String(v.trigger) || "3 packages",
                  }),
              jsx({
                name: "CollapsibleContent",
                props: {},
                children: [
                  jsx({
                    name: "ul",
                    props: { className: LIST },
                    children: PACKAGES.map((name) =>
                      jsx({
                        name: "li",
                        props: { className: ROW },
                        children: name,
                      }),
                    ),
                  }),
                ],
              }),
            ],
          }),
        })
      }
      knobs={KNOBS}
      render={(v) => (
        <LiveCollapsible
          asChild={Boolean(v.asChild)}
          defaultOpen={Boolean(v.defaultOpen)}
          disabled={Boolean(v.disabled)}
          key={String(v.defaultOpen)}
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
        { id: "closed", label: "Closed" },
        { id: "open", label: "Open" },
        { id: "disabled-closed", label: "Disabled, closed" },
        { id: "disabled-open", label: "Disabled, open" },
      ]}
      note="Rows are the two ways to build the trigger. Collapsible has no size, loading or error state, and it adds no chevron of its own: the icon on the Button row is supplied by the caller and does not turn."
      render={(trigger, state) => (
        <Collapsible
          className="w-44"
          defaultOpen={state.endsWith("open")}
          disabled={state.startsWith("disabled")}
        >
          {trigger === "button" ? (
            <CollapsibleTrigger asChild>
              <Button suffix={<ChevronDown />} variant="outline">
                3 packages
              </Button>
            </CollapsibleTrigger>
          ) : (
            <CollapsibleTrigger className={PLAIN_TRIGGER}>3 packages</CollapsibleTrigger>
          )}
          <CollapsibleContent>
            <p className="mt-2 text-muted-foreground text-sm">@nebutra/ui</p>
          </CollapsibleContent>
        </Collapsible>
      )}
      rows={[
        { id: "button", label: "asChild Button" },
        { id: "plain", label: "Bare trigger" },
      ]}
      rowsLabel="Trigger"
    />
  );
}
