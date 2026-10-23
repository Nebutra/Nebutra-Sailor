"use client";

import { Button, HoverCard, HoverCardContent, HoverCardTrigger } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

const SIDES = ["top", "right", "bottom", "left"] as const;
type Side = (typeof SIDES)[number];
type Align = "start" | "center" | "end";

const KNOBS: Knob[] = [
  { name: "trigger", type: "text", defaultValue: "@acme-web" },
  { name: "heading", type: "text", defaultValue: "acme-web" },
  { name: "description", type: "text", defaultValue: "Marketing site. Deployed 2 hours ago." },
  { name: "side", type: "select", options: SIDES, defaultValue: "bottom" },
  { name: "align", type: "select", options: ["start", "center", "end"], defaultValue: "center" },
  { name: "sideOffset", type: "select", options: ["4", "8", "16"], defaultValue: "4" },
  { name: "openDelay", type: "select", options: ["0", "200", "600"], defaultValue: "200" },
  { name: "closeDelay", type: "select", options: ["0", "100", "400"], defaultValue: "100" },
];

function LiveHoverCard({
  trigger,
  heading,
  description,
  side,
  align,
  sideOffset,
  openDelay,
  closeDelay,
}: {
  trigger: string;
  heading: string;
  description: string;
  side: Side;
  align: Align;
  sideOffset: number;
  openDelay: number;
  closeDelay: number;
}) {
  return (
    <HoverCard closeDelay={closeDelay} openDelay={openDelay}>
      <HoverCardTrigger asChild>
        <Button className="max-w-full whitespace-normal break-words" variant="outline">
          {trigger || "@acme-web"}
        </Button>
      </HoverCardTrigger>
      <HoverCardContent
        align={align}
        className="grid max-w-[calc(100vw-2rem)] gap-1 break-words"
        side={side}
        sideOffset={sideOffset}
      >
        <p className="m-0 font-medium">{heading || "acme-web"}</p>
        {description ? <p className="m-0 text-muted-foreground">{description}</p> : null}
      </HoverCardContent>
    </HoverCard>
  );
}

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="Hover the trigger to open the card and move the pointer away to close it. It opens on pointer hover only, so keep anything essential on the page itself."
      code={(v) => {
        const description = String(v.description);
        return snippet({
          imports: [
            {
              names: ["Button", "HoverCard", "HoverCardContent", "HoverCardTrigger"],
              from: "@nebutra/ui/primitives",
            },
          ],
          body: jsx({
            name: "HoverCard",
            defaults: { openDelay: 200, closeDelay: 100 },
            props: { openDelay: Number(v.openDelay), closeDelay: Number(v.closeDelay) },
            children: [
              jsx({
                name: "HoverCardTrigger",
                props: { asChild: true },
                children: [
                  jsx({
                    name: "Button",
                    props: {
                      variant: "outline",
                      className: "max-w-full whitespace-normal break-words",
                    },
                    children: String(v.trigger) || "@acme-web",
                  }),
                ],
              }),
              jsx({
                name: "HoverCardContent",
                defaults: { side: "bottom", align: "center", sideOffset: 4 },
                props: {
                  side: String(v.side),
                  align: String(v.align),
                  sideOffset: Number(v.sideOffset),
                  className: "grid max-w-[calc(100vw-2rem)] gap-1 break-words",
                },
                children: [
                  jsx({
                    name: "p",
                    props: { className: "m-0 font-medium" },
                    children: String(v.heading) || "acme-web",
                  }),
                  ...(description
                    ? [
                        jsx({
                          name: "p",
                          props: { className: "m-0 text-muted-foreground" },
                          children: description,
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
        <LiveHoverCard
          align={v.align as Align}
          closeDelay={Number(v.closeDelay)}
          description={String(v.description)}
          heading={String(v.heading)}
          openDelay={Number(v.openDelay)}
          side={v.side as Side}
          sideOffset={Number(v.sideOffset)}
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
        { id: "default", label: "Default delay" },
        { id: "instant", label: "No open delay" },
        { id: "slow", label: "Slow open" },
        { id: "long", label: "Long content" },
      ]}
      note="Hover each trigger to open its card; the card is a separate real instance per cell. HoverCard has no disabled, loading or invalid prop, and it opens on pointer hover only, so keyboard focus alone does not open it. Preferred placement may flip to stay in the viewport."
      render={(side, kind) => (
        <LiveHoverCard
          align="center"
          closeDelay={100}
          description={
            kind === "long"
              ? "Provisioning a dedicated single-tenant analytics cluster in Frankfurt (eu-central-1)"
              : "Marketing site. Deployed 2 hours ago."
          }
          heading="acme-web"
          openDelay={kind === "instant" ? 0 : kind === "slow" ? 600 : 200}
          side={side as Side}
          sideOffset={4}
          trigger={`Hover ${side}`}
        />
      )}
      rows={SIDES.map((side) => ({ id: side, label: side }))}
      rowsLabel="Preferred side"
    />
  );
}
