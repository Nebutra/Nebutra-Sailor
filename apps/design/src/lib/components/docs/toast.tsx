"use client";

import { useTheme } from "@nebutra/tokens";
import { Button, Toaster, useToasts } from "@nebutra/ui/primitives";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, snippet } from "../code-gen";
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

function useFire() {
  const toasts = useToasts();
  return (opts: FireOptions) => {
    const extra = present({
      description: opts.description || undefined,
      preserve: opts.preserve ? true : undefined,
    });
    if (opts.tone === "message") {
      toasts.message({
        text: opts.text,
        ...extra,
        ...(opts.undo ? { onUndoAction: () => undefined } : {}),
      });
      return;
    }
    toasts[opts.tone](opts.text, extra);
  };
}

function Trigger({ label, ...opts }: FireOptions & { label: string }) {
  const fire = useFire();
  return (
    <Button onClick={() => fire(opts)} variant="outline">
      {label}
    </Button>
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
      hint: "Message tone only. Adds an Undo action and a longer timeout.",
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
      caption="Toasts appear at the bottom right of the window."
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
                undo ? "onUndoAction: () => restore()" : "",
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

        return snippet({
          imports: [{ names: ["Toaster", "useToasts"], from: "@nebutra/ui/primitives" }],
          body: [
            "// Once, in your root layout",
            jsx({ name: "Toaster", props: {} }),
            "",
            "// Anywhere below it",
            "const toasts = useToasts();",
            fire,
          ].join("\n"),
        });
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
          tone with that content. Undo exists on <code>message</code> only. Persistent toasts stay
          until dismissed, so close them before firing the next.
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
            text="Changes saved"
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
