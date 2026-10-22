"use client";

import {
  ButtonLink,
  Skeleton,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonText,
} from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

const SHAPES = ["rounded", "pill", "squared"] as const;

export function Playground(_: DemoProps) {
  const knobs: Knob[] = [
    {
      name: "shape",
      type: "select",
      options: SHAPES,
      defaultValue: "rounded",
      hint: "These select the mutually exclusive rounded, pill and squared props.",
    },
    { name: "show", type: "boolean", defaultValue: true },
    { name: "animated", type: "boolean", defaultValue: true },
    { name: "width", type: "select", options: ["auto", "100%"], defaultValue: "auto" },
    {
      name: "children",
      label: "content",
      type: "text",
      defaultValue: "Production deployment ready",
    },
  ];
  return (
    <ComponentPlayground
      caption="Skeleton wraps real content to keep its layout while loading. show=false renders that content unwrapped. animated=false stops the pulse; the source also honors reduced motion. The surrounding region owns aria-busy."
      code={(v) =>
        snippet({
          imports: [{ names: ["Skeleton"], from: "@nebutra/ui/primitives" }],
          body: jsx({
            name: "section",
            props: {
              "aria-label": "Deployment summary",
              "aria-busy": v.show ? "true" : "false",
              className: "w-64 max-w-full",
            },
            children: [
              jsx({
                name: "Skeleton",
                props: {
                  rounded: v.shape === "rounded",
                  pill: v.shape === "pill",
                  squared: v.shape === "squared",
                  show: v.show ? undefined : raw("false"),
                  animated: v.animated ? undefined : raw("false"),
                  width: v.width === "auto" ? undefined : String(v.width),
                },
                children: [
                  jsx({
                    name: "p",
                    props: { className: "min-h-5 text-foreground text-sm" },
                    children: raw(JSON.stringify(String(v.children))),
                  }),
                ],
              }),
            ],
          }),
        })
      }
      knobs={knobs}
      render={(v) => (
        <section
          aria-busy={Boolean(v.show)}
          aria-label="Deployment summary"
          className="w-64 max-w-full"
        >
          <Skeleton
            animated={Boolean(v.animated)}
            pill={v.shape === "pill"}
            rounded={v.shape === "rounded"}
            show={Boolean(v.show)}
            squared={v.shape === "squared"}
            {...present({ width: v.width === "auto" ? undefined : String(v.width) })}
          >
            <p className="min-h-5 text-foreground text-sm">{String(v.children)}</p>
          </Skeleton>
        </section>
      )}
    />
  );
}

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[{ id: "layout", label: "Loading layout" }]}
      note="Skeleton is a loading placeholder, so the matrix compares actual layouts instead of invented disabled or error states. Text, avatar and card are the library helpers; the final row wraps a real control, which stays inert until shown."
      render={(layout) => (
        <div aria-busy="true" className="w-48">
          {layout === "text" ? (
            <SkeletonText lines={3} />
          ) : layout === "avatar" ? (
            <SkeletonAvatar size="md" />
          ) : layout === "card" ? (
            <SkeletonCard />
          ) : layout === "wrapped" ? (
            <Skeleton rounded>
              <ButtonLink href="#playground" size="sm" variant="outline">
                Explore deployments
              </ButtonLink>
            </Skeleton>
          ) : (
            <Skeleton height={16} rounded width="100%" />
          )}
        </div>
      )}
      rows={[
        { id: "block", label: "Block" },
        { id: "text", label: "Text" },
        { id: "avatar", label: "Avatar" },
        { id: "card", label: "Card" },
        { id: "wrapped", label: "Wrapped control" },
      ]}
      rowsLabel="Layout"
    />
  );
}
