"use client";

import { Inbox } from "@nebutra/icons";
import { EmptyState } from "@nebutra/ui/layout";
import { ButtonLink } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

const SIZES = ["sm", "md", "lg"] as const;
const TONES = ["default", "branded", "subtle"] as const;

export function Playground({ derived }: DemoProps) {
  const knobs: Knob[] = [
    {
      name: "size",
      type: "select",
      options: derived.axes.size?.length ? derived.axes.size : SIZES,
      defaultValue: "md",
    },
    {
      name: "tone",
      type: "select",
      options: derived.axes.tone?.length ? derived.axes.tone : TONES,
      defaultValue: "default",
    },
    { name: "title", type: "text", defaultValue: "Your first deployment starts here" },
    {
      name: "description",
      type: "text",
      defaultValue: "Explore a working example before connecting your repository.",
    },
    { name: "icon", type: "boolean", defaultValue: true },
    { name: "action", type: "boolean", defaultValue: true },
    { name: "secondaryAction", type: "boolean", defaultValue: false },
  ];
  return (
    <ComponentPlayground
      caption="The layout export is the canonical EmptyState's simple form. Tones and sizes are declared in that source. A title explains what is missing, and the action points to a next step."
      code={(v) =>
        snippet({
          imports: [
            { names: ["EmptyState"], from: "@nebutra/ui/layout" },
            ...(v.icon ? [{ names: ["Inbox"], from: "@nebutra/icons" }] : []),
            ...(v.action || v.secondaryAction
              ? [{ names: ["ButtonLink"], from: "@nebutra/ui/primitives" }]
              : []),
          ],
          body: jsx({
            name: "EmptyState",
            defaults: { size: "md", tone: "default" },
            props: {
              className: "w-72 max-w-full",
              size: String(v.size),
              tone: String(v.tone),
              title: String(v.title),
              description: String(v.description) || undefined,
              icon: v.icon ? raw("<Inbox />") : undefined,
              action: v.action
                ? raw('<ButtonLink href="#examples" size="sm">Explore examples</ButtonLink>')
                : undefined,
              secondaryAction: v.secondaryAction
                ? raw(
                    '<ButtonLink href="#states" size="sm" variant="ghost">Compare states</ButtonLink>',
                  )
                : undefined,
            },
          }),
        })
      }
      knobs={knobs}
      render={(v) => (
        <EmptyState
          className="w-72 max-w-full"
          size={v.size as never}
          title={String(v.title)}
          tone={v.tone as never}
          {...present({
            description: String(v.description) || undefined,
            icon: v.icon ? <Inbox /> : undefined,
            action: v.action ? (
              <ButtonLink href="#examples" size="sm">
                Explore examples
              </ButtonLink>
            ) : undefined,
            secondaryAction: v.secondaryAction ? (
              <ButtonLink href="#states" size="sm" variant="ghost">
                Compare states
              </ButtonLink>
            ) : undefined,
          })}
        />
      )}
    />
  );
}

export function StatesMatrix({ derived }: DemoProps) {
  const sizes = derived.axes.size?.length ? derived.axes.size : SIZES;
  const tones = derived.axes.tone?.length ? derived.axes.tone : TONES;
  return (
    <ComponentStatesMatrix
      columns={tones.map((tone) => ({ id: tone, label: tone }))}
      note="This compares the simple form's source sizes and tones. EmptyState has no loading or disabled prop. branded changes the surface; a mascot or preview appears only when supplied."
      render={(size, tone) => (
        <EmptyState
          action={
            <ButtonLink href="#examples" size="sm">
              Explore examples
            </ButtonLink>
          }
          className="w-64"
          description="Explore an example to get started."
          icon={<Inbox />}
          size={size as never}
          title="Your first deployment"
          tone={tone as never}
        />
      )}
      rows={sizes.map((size) => ({ id: size, label: size }))}
      rowsLabel="Size"
    />
  );
}
