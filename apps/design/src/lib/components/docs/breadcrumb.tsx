"use client";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@nebutra/ui/primitives";
import { Fragment, type MouseEvent } from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

const TRAIL = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Acme web", href: "/projects/acme-web" },
  { label: "Deployments", href: "/projects/acme-web/deployments" },
] as const;

const SEPARATORS = ["chevron", "/", "·"] as const;
const LONG_LABEL = "Provisioning a dedicated single-tenant cluster";

function separatorOf(id: string) {
  return id === "chevron" ? undefined : id;
}

/** Keeps the preview in place; the snippet carries the real hrefs. */
const hold = (event: MouseEvent) => event.preventDefault();

const KNOBS: Knob[] = [
  {
    name: "depth",
    type: "select",
    options: ["1", "2", "3", "4"],
    defaultValue: "3",
    hint: "Links before the current page.",
  },
  { name: "current", label: "current page", type: "text", defaultValue: "Settings" },
  { name: "separator", type: "select", options: SEPARATORS, defaultValue: "chevron" },
  { name: "collapsed", type: "boolean", defaultValue: false, hint: "Replaces the middle links." },
  { name: "ariaLabel", label: "aria-label", type: "text", defaultValue: "breadcrumb" },
];

/** The links that stay visible: the first, then the last ones, with an ellipsis between. */
function visibleLinks(depth: number, collapsed: boolean) {
  const links = TRAIL.slice(0, depth);
  return collapsed && links.length > 2 ? [links[0], null, links[links.length - 1]] : links;
}

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="Links are real anchors (held in place here). The last entry is BreadcrumbPage: not a link, marked aria-current. The ellipsis is decoration only; it does not open the hidden levels."
      code={(v) => {
        const items = visibleLinks(Number(v.depth), Boolean(v.collapsed));
        const separator = jsx({
          name: "BreadcrumbSeparator",
          props: {},
          ...(v.separator === "chevron" ? {} : { children: String(v.separator) }),
        });
        const entries = [
          ...items.map((link) =>
            jsx({
              name: "BreadcrumbItem",
              props: {},
              children: [
                link
                  ? jsx({
                      name: "BreadcrumbLink",
                      props: { href: link.href },
                      children: link.label,
                    })
                  : "<BreadcrumbEllipsis />",
              ],
            }),
          ),
          jsx({
            name: "BreadcrumbItem",
            props: {},
            children: [
              jsx({
                name: "BreadcrumbPage",
                props: {},
                children: String(v.current) || "Settings",
              }),
            ],
          }),
        ];
        return snippet({
          imports: [
            {
              names: [
                "Breadcrumb",
                "BreadcrumbItem",
                "BreadcrumbLink",
                "BreadcrumbList",
                "BreadcrumbPage",
                "BreadcrumbSeparator",
                ...(v.collapsed && Number(v.depth) > 2 ? ["BreadcrumbEllipsis"] : []),
              ],
              from: "@nebutra/ui/primitives",
            },
          ],
          body: jsx({
            name: "Breadcrumb",
            defaults: { "aria-label": "breadcrumb" },
            props: { "aria-label": String(v.ariaLabel) || "breadcrumb" },
            children: [
              jsx({
                name: "BreadcrumbList",
                props: {},
                children: entries.flatMap((entry, index) =>
                  index === entries.length - 1 ? [entry] : [entry, separator],
                ),
              }),
            ],
          }),
        });
      }}
      knobs={KNOBS}
      render={(v) => {
        const items = visibleLinks(Number(v.depth), Boolean(v.collapsed));
        const separator = separatorOf(String(v.separator));
        return (
          <div className="w-80 max-w-full">
            <Breadcrumb aria-label={String(v.ariaLabel) || "breadcrumb"}>
              <BreadcrumbList>
                {items.map((link) => (
                  <Fragment key={link?.href ?? "collapsed"}>
                    <BreadcrumbItem>
                      {link ? (
                        <BreadcrumbLink href={link.href} onClick={hold}>
                          {link.label}
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbEllipsis />
                      )}
                    </BreadcrumbItem>
                    <BreadcrumbSeparator>{separator}</BreadcrumbSeparator>
                  </Fragment>
                ))}
                <BreadcrumbItem>
                  <BreadcrumbPage>{String(v.current) || "Settings"}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        );
      }}
    />
  );
}

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "trail", label: "Links and current page" },
        { id: "collapsed", label: "Collapsed" },
        { id: "long", label: "Long labels" },
        { id: "single", label: "Current page only" },
      ]}
      note="Breadcrumb has no size, disabled or loading state: a link is a link and the current page is plain text. Hover a link to see it take the foreground colour; Tab reaches links only. Long labels wrap inside the list."
      render={(separator, column) => (
        <div className="w-72">
          <Breadcrumb aria-label={`${separator} ${column} trail`}>
            <BreadcrumbList>
              {column !== "single" ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#playground" onClick={hold}>
                      Home
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>{separatorOf(separator)}</BreadcrumbSeparator>
                  <BreadcrumbItem>
                    {column === "collapsed" ? (
                      <BreadcrumbEllipsis />
                    ) : (
                      <BreadcrumbLink href="#playground" onClick={hold}>
                        {column === "long" ? LONG_LABEL : "Projects"}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>{separatorOf(separator)}</BreadcrumbSeparator>
                </>
              ) : null}
              <BreadcrumbItem>
                <BreadcrumbPage>Settings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      )}
      rows={SEPARATORS.map((separator) => ({ id: separator, label: separator }))}
      rowsLabel="Separator"
    />
  );
}
