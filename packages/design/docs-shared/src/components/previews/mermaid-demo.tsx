"use client";

import { CodeBlock } from "@nebutra/ui/primitives";

export function MermaidDemo() {
  const code = `graph TD;
    A[Client] -->|HTTP POST| B(Gateway Wrapper);
    B --> C{Authentication};
    C -->|Valid| D[Service Mesh];
    C -->|Invalid| E[401 Unauthorized];
    D --> F[Database Cluster];`;

  return (
    <div className="w-full">
      <CodeBlock
        files={[
          {
            title: "architecture.mermaid",
            code: code,
            language: "mermaid",
          },
        ]}
        showLineNumbers={false}
      />
    </div>
  );
}
