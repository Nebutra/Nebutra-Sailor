"use client";

import { useState } from "react";

type Catalog = { tools: { name: string; parameters: unknown }[] };
let catalog: Promise<Catalog> | undefined;

/** A tool's full JSON Schema, fetched from /docs/agent-tools.json the first time it is opened. */
export function ToolSchema({ name, label }: { name: string; label: string }) {
  const [schema, setSchema] = useState<string | null>(null);
  return (
    <details
      className="kcq-schema"
      onToggle={(event) => {
        if (!(event.currentTarget as HTMLDetailsElement).open || schema) return;
        catalog ??= fetch("/docs/agent-tools.json").then((r) => r.json() as Promise<Catalog>);
        catalog
          .then((data) => {
            const tool = data.tools.find((t) => t.name === name);
            setSchema(JSON.stringify(tool?.parameters ?? {}, null, 2));
          })
          .catch(() => setSchema("// /docs/agent-tools.json could not be loaded"));
      }}
    >
      <summary>{label}</summary>
      <pre className="kcq-schema-body">
        <code>{schema ?? "…"}</code>
      </pre>
    </details>
  );
}
