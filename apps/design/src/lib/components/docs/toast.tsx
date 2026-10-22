"use client";

import { useTheme } from "@nebutra/tokens";
import { Button, Toaster, useToasts } from "@nebutra/ui/primitives";
import { useState } from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

type Tone = "message" | "success" | "warning" | "error";

function tonesOf(derived: DemoProps["derived"]): string[] {
  return derived.axes.tone?.length ? derived.axes.tone : ["message", "success", "warning", "error"];
}

/** The one Toaster on this page. Sonner's "system" theme follows the OS, not the site. */
function PageToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster theme={resolvedTheme === "dark" ? "dark" : "light"} />;
}

interface FireOptions {
  tone: Tone;
  text: string;
  description?: string | undefined;
  undo?: boolean | undefined;
  preserve?: boolean | undefined;
}

function Trigger({ label, ...opts }: FireOptions & { label: string }) {
  const toasts = useToasts();
  const [archived, setArchived] = useState(false);
  const undo = opts.tone === "message" && Boolean(opts.undo);

  function notify() {
    const extra = present({
      description: opts.description || undefined,
      preserve: opts.preserve ? true : undefined,
    });
    if (opts.tone === "message") {
      if (undo) setArchived(true);
      toasts.message({
        text: opts.text,
        ...extra,
        ...(undo ? { onUndoAction: () => setArchived(false) } : {}),
      });
      return;
    }
    toasts[opts.tone](opts.text, extra);
  }

  return (
    <div className="grid max-w-full gap-3">
      <Button onClick={notify} variant="outline">
        {undo ? "Archive project" : label}
      </Button>
      {undo ? (
        <p className="text-muted-foreground text-sm" role="status">
          Project: {archived ? "archived" : "active"}.
        </p>
      ) : null}
    </div>
  );
}

export function Playground({ derived }: DemoProps) {
  const knobs: Knob[] = [
    { name: "tone", type: "select", options: tonesOf(derived), defaultValue: "success" },
    { name: "text", type: "text", defaultValue: "Deployment promoted" },
    { name: "description", type: "text", defaultValue: "" },
    {
      name: "undo",
      type: "boolean",
      defaultValue: false,
      hint: "Message tone only. Archives a local project; Undo restores it.",
    },
    {
      name: "preserve",
      type: "boolean",
      defaultValue: false,
      hint: "Stays until dismissed.",
    },
  ];

  return (
    <ComponentPlayground
      caption="Toasts appear at the bottom right of the window. Message + Undo archives a local sample project; Undo restores it."
      code={(v) => {
        const tone = String(v.tone);
        const text = String(v.text);
        const description = String(v.description);
        const undo = tone === "message" && Boolean(v.undo);
        const options = {
          description: description || undefined,
          preserve: v.preserve ? true : undefined,
        };

        const fire =
          tone === "message"
            ? `toasts.message({ ${[
                `text: ${JSON.stringify(text)}`,
                options.description ? `description: ${JSON.stringify(description)}` : "",
                undo ? "onUndoAction: () => setArchived(false)" : "",
                options.preserve ? "preserve: true" : "",
              ]
                .filter(Boolean)
                .join(", ")} });`
            : `toasts.${tone}(${JSON.stringify(text)}${
                options.description || options.preserve
                  ? `, { ${[
                      options.description ? `description: ${JSON.stringify(description)}` : "",
                      options.preserve ? "preserve: true" : "",
                    ]
                      .filter(Boolean)
                      .join(", ")} }`
                  : ""
              });`;

        const body = jsx({
          name: "div",
          props: { className: "grid max-w-full gap-3" },
          children: [
            jsx({ name: "Toaster", props: {} }),
            jsx({
              name: "Button",
              props: { variant: "outline", onClick: raw("notify") },
              children: undo ? "Archive project" : "Show toast",
            }),
            ...(undo
              ? [
                  jsx({
                    name: "p",
                    props: { className: "text-muted-foreground text-sm", role: "status" },
                    children: raw('"Project: " + (archived ? "archived" : "active") + "."'),
                  }),
                ]
              : []),
          ],
        });
        return `"use client";\n\n${snippet({
          imports: [
            { names: ["Button", "Toaster", "useToasts"], from: "@nebutra/ui/primitives" },
            { names: ["type ReactElement", ...(undo ? ["useState"] : [])], from: "react" },
          ],
          body: `export function ToastExample(): ReactElement {
  const toasts = useToasts();
${undo ? "  const [archived, setArchived] = useState(false);\n" : ""}
  function notify() {
${undo ? "    setArchived(true);\n" : ""}    ${fire}
  }

  return (
${body
  .split("\n")
  .map((line) => `    ${line}`)
  .join("\n")}
  );
}`,
        })}`;
      }}
      knobs={knobs}
      render={(v) => (
        <>
          <PageToaster />
          <Trigger
            description={String(v.description)}
            label="Show toast"
            preserve={Boolean(v.preserve)}
            text={String(v.text)}
            tone={v.tone as Tone}
            undo={Boolean(v.undo)}
          />
        </>
      )}
      stageClassName="min-h-40"
    />
  );
}

const COLUMNS = [
  { id: "title", label: "Title only" },
  { id: "description", label: "With description" },
  { id: "undo", label: "With Undo" },
  { id: "persistent", label: "Persistent" },
];

export function StatesMatrix({ derived }: DemoProps) {
  const rows = tonesOf(derived).map((tone) => ({ id: tone, label: tone }));

  return (
    <ComponentStatesMatrix
      columns={COLUMNS}
      note={
        <>
          A toast is an event, not a resting state, so each cell is a trigger: press it to fire that
          tone with that content. Undo exists on <code>message</code> only: archive the local sample
          project, then Undo to restore it. Persistent toasts stay until dismissed, so close them
          before firing the next.
        </>
      }
      render={(tone, column) =>
        column === "undo" && tone !== "message" ? (
          <span className="text-muted-foreground text-xs">Not available</span>
        ) : (
          <Trigger
            description={column === "description" ? "Visible to everyone on the team." : undefined}
            label="Show"
            preserve={column === "persistent"}
            text={column === "undo" ? "Project archived" : "Changes saved"}
            tone={tone as Tone}
            undo={column === "undo"}
          />
        )
      }
      rows={rows}
      rowsLabel="Tone"
    />
  );
}
