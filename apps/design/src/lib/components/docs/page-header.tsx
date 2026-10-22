"use client";

import { PageHeader } from "@nebutra/ui/layout";
import { Badge, ButtonLink } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

const SIZES = ["page", "section"] as const;
const BREADCRUMBS = `<nav aria-label="Breadcrumb">
  <ol className="flex flex-wrap items-center gap-2 text-sm">
    <li><ButtonLink href="#playground" size="sm" variant="link">Workspace</ButtonLink></li>
    <li aria-current="page">Deployments</li>
  </ol>
</nav>`;

function BreadcrumbTrail() {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        <li>
          <ButtonLink href="#playground" size="sm" variant="link">
            Workspace
          </ButtonLink>
        </li>
        <li aria-current="page">Deployments</li>
      </ol>
    </nav>
  );
}

export function Playground({ derived }: DemoProps) {
  const sizes = derived.axes.size?.length ? derived.axes.size : SIZES;
  const knobs: Knob[] = [
    { name: "size", type: "select", options: sizes, defaultValue: "page" },
    { name: "title", type: "text", defaultValue: "Deployments" },
    { name: "description", type: "text", defaultValue: "Preview and production builds." },
    { name: "actions", type: "boolean", defaultValue: true },
    { name: "breadcrumbs", type: "boolean", defaultValue: false },
    { name: "meta", type: "boolean", defaultValue: false },
    { name: "divider", type: "boolean", defaultValue: false },
  ];
  return (
    <ComponentPlayground
      caption="PageHeader has title, description, breadcrumbs, meta and actions slots. The phone layout stacks actions below the title. Both sizes render an h1; the repeated headers here are specimens."
      code={(v) =>
        snippet({
          imports: [
            { names: ["PageHeader"], from: "@nebutra/ui/layout" },
            ...(v.actions || v.breadcrumbs
              ? [{ names: ["ButtonLink"], from: "@nebutra/ui/primitives" }]
              : []),
            ...(v.meta ? [{ names: ["Badge"], from: "@nebutra/ui/primitives" }] : []),
          ],
          body: jsx({
            name: "PageHeader",
            defaults: { size: "page" },
            props: {
              className: "w-72 max-w-full",
              size: String(v.size),
              title: String(v.title),
              description: String(v.description) || undefined,
              breadcrumbs: v.breadcrumbs ? raw(BREADCRUMBS) : undefined,
              meta: v.meta ? raw('<Badge variant="outline">Production</Badge>') : undefined,
              actions: v.actions
                ? raw(
                    '<ButtonLink href="#examples" size="sm" variant="outline">View examples</ButtonLink>',
                  )
                : undefined,
              divider: v.divider,
            },
          }),
        })
      }
      knobs={knobs}
      render={(v) => (
        <PageHeader
          className="w-72 max-w-full"
          divider={Boolean(v.divider)}
          size={v.size as never}
          title={String(v.title)}
          {...present({
            description: String(v.description) || undefined,
            breadcrumbs: v.breadcrumbs ? <BreadcrumbTrail /> : undefined,
            meta: v.meta ? <Badge variant="outline">Production</Badge> : undefined,
            actions: v.actions ? (
              <ButtonLink href="#examples" size="sm" variant="outline">
                View examples
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
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "title", label: "Title only" },
        { id: "description", label: "Description" },
        { id: "actions", label: "Actions" },
        { id: "breadcrumbs", label: "Breadcrumbs + meta" },
        { id: "divider", label: "Divider" },
      ]}
      note="page and section are the source size values. Columns exercise supported slots and the divider prop. PageHeader has no loading or disabled prop; an action can carry its own state."
      render={(size, column) => (
        <PageHeader
          className="w-64"
          divider={column === "divider"}
          size={size as never}
          title="Deployments"
          {...present({
            description: column !== "title" ? "Preview and production builds." : undefined,
            breadcrumbs: column === "breadcrumbs" ? <BreadcrumbTrail /> : undefined,
            meta:
              column === "breadcrumbs" ? <Badge variant="outline">Production</Badge> : undefined,
            actions:
              column === "actions" ? (
                <ButtonLink href="#playground" size="sm" variant="outline">
                  Try header
                </ButtonLink>
              ) : undefined,
          })}
        />
      )}
      rows={sizes.map((size) => ({ id: size, label: size }))}
      rowsLabel="Size"
    />
  );
}
