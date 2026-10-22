"use client";

import { AnimateIn } from "@nebutra/ui/components";
import { Button, Card } from "@nebutra/ui/primitives";
import { useState } from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";

function Entrance({
  preset,
  delay,
  inView,
  label,
}: {
  preset: string;
  delay: number;
  inView: boolean;
  label: string;
}) {
  const [run, setRun] = useState(0);
  return (
    <div className="flex w-64 max-w-full flex-col items-start gap-4">
      <Button onClick={() => setRun((value) => value + 1)} size="sm" variant="outline">
        Replay
      </Button>
      <div className="w-full overflow-hidden p-2">
        <AnimateIn delay={delay} inView={inView} key={run} preset={preset as never}>
          <Card padding="sm">
            <Card.Description>{label}</Card.Description>
          </Card>
        </AnimateIn>
      </div>
    </div>
  );
}

export function Playground({ derived }: DemoProps) {
  const knobs: Knob[] = [
    { name: "preset", type: "select", options: derived.axes.preset ?? [], defaultValue: "fade" },
    { name: "delay", type: "select", options: ["0", "0.15", "0.3"], defaultValue: "0" },
    { name: "inView", type: "boolean", defaultValue: false },
    { name: "children", label: "content", type: "text", defaultValue: "Deployment ready" },
  ];
  return (
    <ComponentPlayground
      caption="Replay remounts AnimateIn explicitly. Presets come from PRESETS; the source default is fade. inView waits for the viewport once per mount. Reduced motion uses the component's opacity-only entrance, without travel or blur."
      code={(v) => {
        const content = jsx({
          name: "div",
          props: { className: "w-full overflow-hidden p-2" },
          children: [
            jsx({
              name: "AnimateIn",
              defaults: { preset: "fade", delay: 0 },
              props: {
                key: raw("run"),
                preset: String(v.preset),
                delay: Number(v.delay),
                inView: v.inView,
              },
              children: [
                jsx({
                  name: "Card",
                  props: { padding: "sm" },
                  children: [
                    jsx({
                      name: "Card.Description",
                      props: {},
                      children: raw(JSON.stringify(String(v.children))),
                    }),
                  ],
                }),
              ],
            }),
          ],
        });
        const body = jsx({
          name: "div",
          props: { className: "flex w-64 max-w-full flex-col items-start gap-4" },
          children: [
            jsx({
              name: "Button",
              props: {
                onClick: raw("() => setRun((value) => value + 1)"),
                size: "sm",
                variant: "outline",
              },
              children: "Replay",
            }),
            content,
          ],
        });
        return `"use client";\n\n${snippet({
          imports: [
            { names: ["useState"], from: "react" },
            { names: ["AnimateIn"], from: "@nebutra/ui/components" },
            { names: ["Button", "Card"], from: "@nebutra/ui/primitives" },
          ],
          body: `export function EntranceExample() {
  const [run, setRun] = useState(0);
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
        <Entrance
          delay={Number(v.delay)}
          inView={Boolean(v.inView)}
          key={JSON.stringify(v)}
          label={String(v.children)}
          preset={String(v.preset)}
        />
      )}
    />
  );
}

export function StatesMatrix({ derived }: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "mount", label: "On mount" },
        { id: "viewport", label: "On entering view" },
      ]}
      note="Each source preset has its own Replay button. The viewport column uses inView, so a cell outside the scroll frame waits until visible. Reduced motion remains governed by AnimateIn in every cell."
      render={(preset, column) => (
        <div className="w-48">
          <Entrance delay={0} inView={column === "viewport"} label={preset} preset={preset} />
        </div>
      )}
      rows={(derived.axes.preset ?? []).map((preset) => ({ id: preset, label: preset }))}
      rowsLabel="Preset"
    />
  );
}
