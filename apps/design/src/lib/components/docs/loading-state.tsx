"use client";

import { LoadingState } from "@nebutra/ui/layout";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

const SIZES = ["small", "medium", "large"] as const;

export function Playground({ derived }: DemoProps) {
  const knobs: Knob[] = [
    {
      name: "size",
      type: "select",
      options: derived.axes.size?.length ? derived.axes.size : SIZES,
      defaultValue: "large",
    },
    { name: "message", type: "text", defaultValue: "Fetching deployments..." },
  ];
  return (
    <ComponentPlayground
      caption="Mounting LoadingState means pending. Its source delays visibility to avoid flashing on quick loads. The message is the spinner's accessible name; an omitted message falls back to Loading."
      code={(v) =>
        snippet({
          imports: [{ names: ["LoadingState"], from: "@nebutra/ui/layout" }],
          body: jsx({
            name: "div",
            props: { className: "w-64 max-w-full" },
            children: [
              jsx({
                name: "LoadingState",
                defaults: { size: "large" },
                props: {
                  size: String(v.size),
                  message: String(v.message) || undefined,
                },
              }),
            ],
          }),
        })
      }
      knobs={knobs}
      render={(v) => (
        <div className="w-64 max-w-full">
          <LoadingState
            size={v.size as never}
            {...present({ message: String(v.message) || undefined })}
          />
        </div>
      )}
    />
  );
}

export function StatesMatrix({ derived }: DemoProps) {
  const sizes = derived.axes.size?.length ? derived.axes.size : SIZES;
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "message", label: "With message" },
        { id: "bare", label: "Fallback name" },
        { id: "long", label: "Wrapping message" },
      ]}
      note="All cells are pending content with the source size values. Message presence and length vary; there is no disabled, empty or error mode on LoadingState. The caller replaces it when the operation settles."
      render={(size, column) => (
        <div className="w-48">
          <LoadingState
            size={size as never}
            {...present({
              message:
                column === "bare"
                  ? undefined
                  : column === "long"
                    ? "Fetching the deployment history for the production environment..."
                    : "Fetching deployments...",
            })}
          />
        </div>
      )}
      rows={sizes.map((size) => ({ id: size, label: size }))}
      rowsLabel="Size"
    />
  );
}
