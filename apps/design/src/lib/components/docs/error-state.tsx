"use client";

import { ErrorState } from "@nebutra/ui/layout";
import { type ComponentProps, useState } from "react";
import { ComponentPlayground, type Knob } from "@/components/component-playground";
import { ComponentStatesMatrix } from "@/components/component-states-matrix";
import { jsx, raw, snippet } from "../code-gen";
import type { DemoProps } from "../derived";
import { present } from "./present";

type RecoveryProps = Omit<ComponentProps<typeof ErrorState>, "onRetry"> & { retry: boolean };

function Recovery({ retry, ...props }: RecoveryProps) {
  const [retries, setRetries] = useState(0);
  return (
    <div className="w-72 max-w-full">
      <ErrorState
        {...props}
        {...present({ onRetry: retry ? () => setRetries((count) => count + 1) : undefined })}
      />
      {retry ? (
        <p className="text-muted-foreground text-xs" role="status">
          Retry requested: {retries}
        </p>
      ) : null}
    </div>
  );
}

export function Playground(_: DemoProps) {
  const knobs: Knob[] = [
    { name: "title", type: "text", defaultValue: "Could not load deployments" },
    { name: "message", type: "text", defaultValue: "The deployments API did not respond in time." },
    { name: "errorId", type: "text", defaultValue: "dpl_7Hq2xR" },
    { name: "retry", label: "onRetry", type: "boolean", defaultValue: true },
  ];
  return (
    <ComponentPlayground
      caption="The retry callback records a request in this local example. It does not resolve the error automatically. With no onRetry the action disappears. errorId provides expandable diagnostic details."
      code={(v) => {
        const body = jsx({
          name: "div",
          props: { className: "w-72 max-w-full" },
          children: [
            jsx({
              name: "ErrorState",
              props: {
                title: String(v.title) || undefined,
                message: String(v.message) || undefined,
                errorId: String(v.errorId) || undefined,
                onRetry: v.retry ? raw("() => setRetries((count) => count + 1)") : undefined,
              },
            }),
            ...(v.retry
              ? [
                  jsx({
                    name: "p",
                    props: { className: "text-muted-foreground text-xs", role: "status" },
                    children: raw('"Retry requested: " + retries'),
                  }),
                ]
              : []),
          ],
        });
        const code = snippet({
          imports: [
            { names: ["ErrorState"], from: "@nebutra/ui/layout" },
            ...(v.retry ? [{ names: ["useState"], from: "react" }] : []),
          ],
          body: v.retry
            ? `export function FailedDeployments() {
  const [retries, setRetries] = useState(0);
  return (
${body
  .split("\n")
  .map((line) => `    ${line}`)
  .join("\n")}
  );
}`
            : body,
        });
        return v.retry ? `"use client";\n\n${code}` : code;
      }}
      knobs={knobs}
      render={(v) => (
        <Recovery
          key={JSON.stringify(v)}
          retry={Boolean(v.retry)}
          {...present({
            title: String(v.title) || undefined,
            message: String(v.message) || undefined,
            errorId: String(v.errorId) || undefined,
          })}
        />
      )}
    />
  );
}

export function StatesMatrix(_: DemoProps) {
  return (
    <ComponentStatesMatrix
      columns={[
        { id: "terminal", label: "No retry callback" },
        { id: "retry", label: "With retry callback" },
      ]}
      note="Rows vary the supported message and diagnostic identifier, while columns vary onRetry. Every retry updates its own counter. ErrorState has no size, disabled or loading prop."
      render={(content, column) => (
        <Recovery
          retry={column === "retry"}
          title="Could not load deployments"
          {...present({
            message:
              content === "title" ? undefined : "The deployments API did not respond in time.",
            errorId: content === "diagnostic" ? "dpl_7Hq2xR" : undefined,
          })}
        />
      )}
      rows={[
        { id: "title", label: "Title only" },
        { id: "message", label: "With message" },
        { id: "diagnostic", label: "With diagnostic id" },
      ]}
      rowsLabel="Content"
    />
  );
}
