"use client";

import { Pagination } from "@nebutra/ui/primitives";
import type { MouseEvent } from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

const LONG_TITLE = "Provisioning a dedicated single-tenant analytics cluster in Frankfurt";

/** Keeps the preview in place; the snippet carries the real hrefs. */
const hold = (event: MouseEvent) => {
  if (event.target instanceof Element && event.target.closest("a")) event.preventDefault();
};

const KNOBS: Knob[] = [
  { name: "hasPrevious", label: "previous", type: "boolean", defaultValue: true },
  { name: "hasNext", label: "next", type: "boolean", defaultValue: true },
  { name: "previousTitle", type: "text", defaultValue: "Installation" },
  { name: "nextTitle", type: "text", defaultValue: "Theming" },
  { name: "previousLabel", type: "text", defaultValue: "Previous" },
  { name: "nextLabel", type: "text", defaultValue: "Next" },
  { name: "ariaLabel", label: "aria-label", type: "text", defaultValue: "Page navigation" },
];

export function Playground(_: DemoProps) {
  return (
    <ComponentPlayground
      caption="Pagination is a previous/next rail, not a numbered page list. Leave a side out on the first or last page and its slot stays empty. The links are held in place here; below the sm breakpoint the two stack."
      code={(v) => {
        const destination = (title: unknown, href: string) =>
          raw(`{ title: ${JSON.stringify(String(title))}, href: ${JSON.stringify(href)} }`);
        return snippet({
          imports: [{ names: ["Pagination"], from: "@nebutra/ui/primitives" }],
          body: jsx({
            name: "Pagination",
            defaults: {
              previousLabel: "Previous",
              nextLabel: "Next",
              "aria-label": "Page navigation",
            },
            props: {
              "aria-label": String(v.ariaLabel),
              previous: v.hasPrevious
                ? destination(v.previousTitle || "Installation", "/docs/installation")
                : undefined,
              next: v.hasNext ? destination(v.nextTitle || "Theming", "/docs/theming") : undefined,
              previousLabel: String(v.previousLabel),
              nextLabel: String(v.nextLabel),
            },
          }),
        });
      }}
      knobs={KNOBS}
      render={(v) => (
        <div className="w-[30rem] max-w-full">
          <Pagination
            aria-label={String(v.ariaLabel)}
            nextLabel={String(v.nextLabel)}
            onClick={hold}
            previousLabel={String(v.previousLabel)}
            {...(v.hasNext
              ? { next: { title: String(v.nextTitle) || "Theming", href: "#playground" } }
              : {})}
            {...(v.hasPrevious
              ? {
                  previous: {
                    title: String(v.previousTitle) || "Installation",
                    href: "#playground",
                  },
                }
              : {})}
          />
        </div>
      )}
    />
  );
}

const ARRANGEMENTS = [
  { id: "both", label: "previous and next" },
  { id: "first", label: "next only (first page)" },
  { id: "last", label: "previous only (last page)" },
];

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "short", label: "Short titles" },
        { id: "long", label: "Long titles" },
        { id: "labels", label: "Custom captions" },
      ]}
      note="Pagination has no size, disabled, loading or current-page state: it only links to neighbours. An absent side is an empty slot, not a disabled button. Hover a rail to see its border and background change; Tab reaches each link."
      render={(arrangement, column) => (
        <div className="w-[26rem]">
          <Pagination
            aria-label={`${arrangement} ${column} navigation`}
            onClick={hold}
            {...(column === "labels" ? { previousLabel: "Back", nextLabel: "Continue" } : {})}
            {...(arrangement === "last" || arrangement === "both"
              ? {
                  previous: {
                    title: column === "long" ? LONG_TITLE : "Installation",
                    href: "#playground",
                  },
                }
              : {})}
            {...(arrangement === "first" || arrangement === "both"
              ? {
                  next: {
                    title: column === "long" ? LONG_TITLE : "Theming",
                    href: "#playground",
                  },
                }
              : {})}
          />
        </div>
      )}
      rows={ARRANGEMENTS}
      rowsLabel="Neighbours"
    />
  );
}
