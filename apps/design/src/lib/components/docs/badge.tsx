"use client";

import { CheckCircle } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import { axis, axisDefault, type DemoProps } from "../derived";
import { present } from "./present";

export function Playground({ derived }: DemoProps) {
  const defaults = {
    variant: axisDefault(derived, "badge", "variant") ?? "default",
    size: axisDefault(derived, "badge", "size") ?? "md",
  };
  const knobs: Knob[] = [
    {
      name: "variant",
      type: "select",
      options: axis(derived, "badge", "variant"),
      defaultValue: defaults.variant,
    },
    {
      name: "size",
      type: "select",
      options: axis(derived, "badge", "size"),
      defaultValue: defaults.size,
    },
    { name: "children", label: "label", type: "text", defaultValue: "Ready" },
    { name: "icon", type: "boolean", defaultValue: false },
    { name: "asChild", label: "asChild (link)", type: "boolean", defaultValue: false },
  ];

  return (
    <ComponentPlayground
      caption="Badge is a label: it has no disabled or loading state. asChild puts the badge on a real link. Long labels remain on one line and scroll within this stage."
      code={(v) =>
        snippet({
          imports: [
            { names: ["Badge"], from: "@nebutra/ui/primitives" },
            ...(v.icon ? [{ names: ["CheckCircle"], from: "@nebutra/icons" }] : []),
          ],
          body: jsx({
            name: "Badge",
            defaults,
            props: {
              variant: String(v.variant),
              size: String(v.size),
              icon: v.icon ? raw("<CheckCircle />") : undefined,
              asChild: v.asChild,
            },
            children: v.asChild
              ? [
                  jsx({
                    name: "a",
                    props: { href: "#states" },
                    children: raw(JSON.stringify(String(v.children))),
                  }),
                ]
              : raw(JSON.stringify(String(v.children))),
          }),
        })
      }
      knobs={knobs}
      render={(v) => (
        <Badge
          asChild={Boolean(v.asChild)}
          size={v.size as never}
          variant={v.variant as never}
          {...present({ icon: v.icon ? <CheckCircle /> : undefined })}
        >
          {v.asChild ? <a href="#states">{String(v.children)}</a> : String(v.children)}
        </Badge>
      )}
    />
  );
}

export function StatesMatrix({ derived }: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "label", label: "Label" },
        { id: "icon", label: "With icon" },
        { id: "link", label: "Link" },
      ]}
      note="Sizes come from badgeVariants. These are content and element compositions, with no invented disabled or loading props. Only link badges are keyboard targets."
      render={(size, column) => (
        <Badge
          asChild={column === "link"}
          size={size as never}
          {...present({ icon: column === "icon" ? <CheckCircle /> : undefined })}
        >
          {column === "link" ? <a href="#playground">Ready</a> : "Ready"}
        </Badge>
      )}
      rows={axis(derived, "badge", "size").map((size) => ({ id: size, label: size }))}
      rowsLabel="Size"
    />
  );
}
