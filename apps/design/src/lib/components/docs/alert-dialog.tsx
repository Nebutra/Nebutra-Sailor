"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Input,
} from "@nebutra/ui/primitives";
import { useId, useState } from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

const PROJECT = "acme-web";

const KNOBS: Knob[] = [
  { name: "trigger", type: "text", defaultValue: "Delete project" },
  { name: "title", type: "text", defaultValue: "Delete acme-web?" },
  {
    name: "description",
    type: "text",
    defaultValue: "This permanently deletes the project and its deployments. It cannot be undone.",
  },
  { name: "action", type: "text", defaultValue: "Delete project" },
  { name: "cancel", type: "text", defaultValue: "Cancel" },
  { name: "destructive", type: "boolean", defaultValue: true },
  {
    name: "requireTyping",
    type: "boolean",
    defaultValue: false,
    hint: "Keeps the action disabled until the project name is typed.",
  },
];

function LiveAlertDialog({
  trigger,
  title,
  description,
  action,
  cancel,
  destructive,
  requireTyping,
}: {
  trigger: string;
  title: string;
  description: string;
  action: string;
  cancel: string;
  destructive: boolean;
  requireTyping: boolean;
}) {
  const id = useId();
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState("Nothing confirmed yet.");
  const locked = requireTyping && typed !== PROJECT;
  return (
    <div className="grid max-w-full gap-3">
      <AlertDialog
        onOpenChange={(open) => {
          if (open) setTyped("");
        }}
      >
        <AlertDialogTrigger asChild>
          <Button className="max-w-full whitespace-normal break-words" variant="outline">
            {trigger || "Delete project"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] break-words">
          <AlertDialogHeader>
            <AlertDialogTitle>{title || "Delete acme-web?"}</AlertDialogTitle>
            {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
          </AlertDialogHeader>
          {requireTyping ? (
            <Input
              id={`${id}-confirm`}
              label={`Type ${PROJECT} to confirm`}
              onValueChange={setTyped}
              value={typed}
            />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResult("Cancelled. Nothing changed.")}>
              {cancel || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                disabled={locked}
                onClick={() => setResult("Confirmed.")}
                variant={destructive ? "destructive" : "default"}
              >
                {action || "Delete project"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <p aria-live="polite" className="text-muted-foreground">
        {result}
      </p>
    </div>
  );
}

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="Click the backdrop and nothing happens. Only Cancel, the action or Escape closes it, and focus returns to the trigger."
      code={(v) => {
        const title = String(v.title) || "Delete acme-web?";
        const description = String(v.description);
        const body = jsx({
          name: "div",
          props: { className: "grid max-w-full gap-3" },
          children: [
            jsx({
              name: "AlertDialog",
              props: {
                onOpenChange: v.requireTyping ? raw('(open) => open && setTyped("")') : undefined,
              },
              children: [
                jsx({
                  name: "AlertDialogTrigger",
                  props: { asChild: true },
                  children: [
                    jsx({
                      name: "Button",
                      props: {
                        variant: "outline",
                        className: "max-w-full whitespace-normal break-words",
                      },
                      children: String(v.trigger) || "Delete project",
                    }),
                  ],
                }),
                jsx({
                  name: "AlertDialogContent",
                  props: { className: "max-w-[calc(100vw-2rem)] break-words" },
                  children: [
                    jsx({
                      name: "AlertDialogHeader",
                      props: {},
                      children: [
                        jsx({ name: "AlertDialogTitle", props: {}, children: title }),
                        ...(description
                          ? [
                              jsx({
                                name: "AlertDialogDescription",
                                props: {},
                                children: description,
                              }),
                            ]
                          : []),
                      ],
                    }),
                    ...(v.requireTyping
                      ? [
                          jsx({
                            name: "Input",
                            props: {
                              id: "confirm-name",
                              label: `Type ${PROJECT} to confirm`,
                              value: raw("typed"),
                              onValueChange: raw("setTyped"),
                            },
                          }),
                        ]
                      : []),
                    jsx({
                      name: "AlertDialogFooter",
                      props: {},
                      children: [
                        jsx({
                          name: "AlertDialogCancel",
                          props: { onClick: raw('() => setResult("Cancelled. Nothing changed.")') },
                          children: String(v.cancel) || "Cancel",
                        }),
                        jsx({
                          name: "AlertDialogAction",
                          props: { asChild: true },
                          children: [
                            jsx({
                              name: "Button",
                              defaults: { variant: "default", disabled: false },
                              props: {
                                variant: v.destructive ? "destructive" : "default",
                                disabled: v.requireTyping ? raw(`typed !== "${PROJECT}"`) : false,
                                onClick: raw('() => setResult("Confirmed.")'),
                              },
                              children: String(v.action) || "Delete project",
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            jsx({
              name: "p",
              props: { "aria-live": "polite", className: "text-muted-foreground" },
              children: raw("result"),
            }),
          ],
        });
        return `"use client";\n\n${snippet({
          imports: [
            {
              names: [
                "AlertDialog",
                "AlertDialogAction",
                "AlertDialogCancel",
                "AlertDialogContent",
                "AlertDialogFooter",
                "AlertDialogHeader",
                "AlertDialogTitle",
                "AlertDialogTrigger",
                "Button",
                ...(description ? ["AlertDialogDescription"] : []),
                ...(v.requireTyping ? ["Input"] : []),
              ],
              from: "@nebutra/ui/primitives",
            },
            { names: ["type ReactElement", "useState"], from: "react" },
          ],
          body: `export function DeleteProject(): ReactElement {\n${
            v.requireTyping ? '  const [typed, setTyped] = useState("");\n' : ""
          }  const [result, setResult] = useState("Nothing confirmed yet.");\n  return (\n${body
            .split("\n")
            .map((line) => `    ${line}`)
            .join("\n")}\n  );\n}`,
        })}`;
      }}
      knobs={KNOBS}
      render={(v) => (
        <LiveAlertDialog
          action={String(v.action)}
          cancel={String(v.cancel)}
          description={String(v.description)}
          destructive={Boolean(v.destructive)}
          requireTyping={Boolean(v.requireTyping)}
          title={String(v.title)}
          trigger={String(v.trigger)}
        />
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
  { id: "locked", label: "Awaiting confirmation" },
  { id: "submitting", label: "Submitting" },
];

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={COLUMNS}
      note={
        <>
          A modal cannot sit in a grid, so this shows the footer across the states an alert dialog
          passes through. AlertDialogAction and AlertDialogCancel need an open dialog to mount, so
          plain Buttons stand in for them. AlertDialog has no loading or invalid prop of its own:
          those come from the Button and the Input you put inside it.
        </>
      }
      render={(row, column) => (
        <AlertDialogFooter className="sm:space-x-0 sm:gap-2">
          <Button disabled={column === "submitting"} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={column === "locked"}
            loading={column === "submitting"}
            variant={row === "destructive" ? "destructive" : "default"}
          >
            {row === "destructive" ? "Delete project" : "Continue"}
          </Button>
        </AlertDialogFooter>
      )}
      rows={ROWS}
      rowsLabel="Action button"
    />
  );
}
