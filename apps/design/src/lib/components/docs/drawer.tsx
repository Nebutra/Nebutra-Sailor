"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

const DIRECTIONS = ["top", "bottom", "left", "right"] as const;
type Direction = (typeof DIRECTIONS)[number];

const HEIGHTS = ["auto", "320", "480", "60vh"] as const;

const KNOBS: Knob[] = [
  { name: "trigger", type: "text", defaultValue: "Open drawer" },
  { name: "title", type: "text", defaultValue: "Release notes" },
  { name: "description", type: "text", defaultValue: "What changed in this version." },
  { name: "direction", type: "select", options: DIRECTIONS, defaultValue: "bottom" },
  {
    name: "height",
    type: "select",
    options: HEIGHTS,
    defaultValue: "auto",
    hint: "Caps the height of top and bottom drawers. Numbers resolve to px.",
  },
  {
    name: "showHandle",
    type: "boolean",
    defaultValue: true,
    hint: "The drag handle is only drawn on bottom drawers.",
  },
  { name: "verticalScroll", type: "boolean", defaultValue: true },
  {
    name: "dismissible",
    type: "boolean",
    defaultValue: true,
    hint: "Off disables swipe, Escape and outside press; the footer button still closes it.",
  },
  { name: "body", type: "select", options: ["short", "long"], defaultValue: "short" },
  { name: "showFooter", type: "boolean", defaultValue: true },
];

// The height knob is a select, so it carries strings; "auto" means the prop is left off.
function heightOf(value: string): number | string | undefined {
  if (value === "auto") return undefined;
  const asNumber = Number(value);
  return Number.isNaN(asNumber) ? value : asNumber;
}

const BODY_PARAGRAPH = "mb-3 text-muted-foreground text-sm";

function LiveDrawer({
  trigger,
  title,
  description,
  direction,
  height,
  showHandle,
  verticalScroll,
  dismissible,
  body,
  showFooter,
}: {
  trigger: string;
  title: string;
  description: string;
  direction: Direction;
  height: string;
  showHandle: boolean;
  verticalScroll: boolean;
  dismissible: boolean;
  body: string;
  showFooter: boolean;
}) {
  return (
    <Drawer
      dismissible={dismissible}
      direction={direction}
      {...present({ height: heightOf(height) })}
    >
      <DrawerTrigger asChild>
        <Button className="max-w-full whitespace-normal break-words" variant="outline">
          {trigger || "Open drawer"}
        </Button>
      </DrawerTrigger>
      <DrawerContent showHandle={showHandle} verticalScroll={verticalScroll}>
        <DrawerHeader>
          <DrawerTitle>{title || "Release notes"}</DrawerTitle>
          {description ? <DrawerDescription>{description}</DrawerDescription> : null}
        </DrawerHeader>
        <DrawerBody>
          {body === "long" ? (
            Array.from({ length: 12 }, (_, index) => (
              <p className={BODY_PARAGRAPH} key={index}>
                Release note {index + 1}
              </p>
            ))
          ) : (
            <p className={BODY_PARAGRAPH}>Faster builds and a new project overview.</p>
          )}
        </DrawerBody>
        {showFooter ? (
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="Bottom drawers drag down to dismiss. Escape and an outside press also close it unless dismissible is off, and focus returns to the trigger."
      code={(v) => {
        const description = String(v.description);
        const names = [
          "Button",
          "Drawer",
          "DrawerBody",
          "DrawerContent",
          "DrawerHeader",
          "DrawerTitle",
          "DrawerTrigger",
          ...(description ? ["DrawerDescription"] : []),
          ...(v.showFooter ? ["DrawerClose", "DrawerFooter"] : []),
        ];
        const longBody = `{Array.from({ length: 12 }, (_, index) => (\n  <p className="${BODY_PARAGRAPH}" key={index}>\n    Release note {index + 1}\n  </p>\n))}`;
        const header = jsx({
          name: "DrawerHeader",
          props: {},
          children: [
            jsx({ name: "DrawerTitle", props: {}, children: String(v.title) || "Release notes" }),
            ...(description
              ? [jsx({ name: "DrawerDescription", props: {}, children: description })]
              : []),
          ],
        });

        return snippet({
          imports: [{ names, from: "@nebutra/ui/primitives" }],
          body: jsx({
            name: "Drawer",
            defaults: { direction: "bottom", dismissible: true },
            props: {
              direction: String(v.direction),
              dismissible: v.dismissible,
              height: heightOf(String(v.height)),
            },
            children: [
              jsx({
                name: "DrawerTrigger",
                props: { asChild: true },
                children: [
                  jsx({
                    name: "Button",
                    props: {
                      variant: "outline",
                      className: "max-w-full whitespace-normal break-words",
                    },
                    children: String(v.trigger) || "Open drawer",
                  }),
                ],
              }),
              jsx({
                name: "DrawerContent",
                defaults: { showHandle: true, verticalScroll: true },
                props: { showHandle: v.showHandle, verticalScroll: v.verticalScroll },
                children: [
                  header,
                  jsx({
                    name: "DrawerBody",
                    props: {},
                    children:
                      v.body === "long"
                        ? [longBody]
                        : [
                            jsx({
                              name: "p",
                              props: { className: BODY_PARAGRAPH },
                              children: "Faster builds and a new project overview.",
                            }),
                          ],
                  }),
                  ...(v.showFooter
                    ? [
                        jsx({
                          name: "DrawerFooter",
                          props: {},
                          children: [
                            jsx({
                              name: "DrawerClose",
                              props: { asChild: true },
                              children: [
                                jsx({
                                  name: "Button",
                                  props: { variant: "outline" },
                                  children: "Close",
                                }),
                              ],
                            }),
                          ],
                        }),
                      ]
                    : []),
                ],
              }),
            ],
          }),
        });
      }}
      knobs={KNOBS}
      render={(v) => (
        <LiveDrawer
          body={String(v.body)}
          description={String(v.description)}
          direction={v.direction as Direction}
          dismissible={Boolean(v.dismissible)}
          height={String(v.height)}
          showFooter={Boolean(v.showFooter)}
          showHandle={Boolean(v.showHandle)}
          title={String(v.title)}
          trigger={String(v.trigger)}
          verticalScroll={Boolean(v.verticalScroll)}
        />
      )}
    />
  );
}

// One closed drawer per cell; the panel mounts in a portal only when its trigger is pressed.
function DrawerCell({ direction, kind }: { direction: Direction; kind: string }) {
  const drawer = (
    <Drawer
      dismissible={kind !== "locked"}
      direction={direction}
      {...present({ height: kind === "fixed" ? 320 : undefined })}
    >
      <DrawerTrigger asChild disabled={kind === "disabled"}>
        <Button disabled={kind === "disabled"} size="sm" variant="outline">
          Open {direction}
        </Button>
      </DrawerTrigger>
      <DrawerContent showHandle={kind !== "no-handle"}>
        <DrawerHeader>
          <DrawerTitle>Release notes</DrawerTitle>
          <DrawerDescription>What changed in this version.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          {Array.from({ length: kind === "scroll" ? 14 : 1 }, (_, index) => (
            <p className={BODY_PARAGRAPH} key={index}>
              Release note {index + 1}
            </p>
          ))}
        </DrawerBody>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );

  if (kind !== "in-dialog") {
    return drawer;
  }

  // The drawer is launched from inside an open Dialog, to show it stacking above it.
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Dialog, then {direction}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Invite a teammate</DialogTitle>
        <DialogDescription>Review the role in a drawer before sending.</DialogDescription>
        {drawer}
      </DialogContent>
    </Dialog>
  );
}

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "default", label: "Default" },
        { id: "no-handle", label: "No handle" },
        { id: "fixed", label: "Height 320" },
        { id: "scroll", label: "Long body" },
        { id: "locked", label: "Not dismissible" },
        { id: "disabled", label: "Disabled trigger" },
        { id: "in-dialog", label: "In a Dialog" },
      ]}
      note="Every cell opens its own real drawer on demand. Drawer has no loading, invalid or empty state of its own, so those come from what you put in the body. The handle shows only on bottom drawers, and height only caps top and bottom ones. Not dismissible turns off swipe, Escape and outside press; the footer button still closes it. In a Dialog opens a dialog first and launches the drawer from inside it: the drawer shares Sheet's overlay layers, so its panel stacks above the dialog. Header text is start-aligned except on bottom drawers, and left and right are physical edges that do not flip under dir=rtl."
      render={(direction, kind) => <DrawerCell direction={direction as Direction} kind={kind} />}
      rows={DIRECTIONS.map((direction) => ({ id: direction, label: direction }))}
      rowsLabel="Direction"
    />
  );
}
