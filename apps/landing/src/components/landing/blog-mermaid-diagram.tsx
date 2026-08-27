"use client";

import { useEffect, useId, useState } from "react";

type BlogMermaidDiagramProps = {
  chart: string;
};

export function BlogMermaidDiagram({ chart }: BlogMermaidDiagramProps) {
  const trimmedChart = chart.trim();
  const rawId = useId();
  const renderId = `blog-mermaid-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      setError(null);
      setSvg(null);
      if (!trimmedChart) return;

      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({
          fontFamily: "var(--font-sans)",
          securityLevel: "loose",
          startOnLoad: false,
          theme: "neutral",
        });

        const result = await mermaid.render(renderId, trimmedChart);
        if (!cancelled) setSvg(result.svg);
      } catch (renderError) {
        if (!cancelled) {
          setError(renderError instanceof Error ? renderError.message : "Mermaid render failed");
        }
      }
    }

    void renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [renderId, trimmedChart]);

  if (!trimmedChart) return null;

  if (error) {
    return (
      <figure className="my-8 rounded-[var(--radius-lg)] border border-border bg-background p-4 shadow-sm">
        <figcaption className="text-sm font-semibold text-foreground">Diagram source</figcaption>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The diagram renderer could not load, so the source is available below.
        </p>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            Show Mermaid source
          </summary>
          <pre className="mt-3 overflow-x-auto rounded-[var(--radius-md)] bg-muted p-3 font-mono text-xs leading-6 text-muted-foreground">
            {trimmedChart}
          </pre>
        </details>
      </figure>
    );
  }

  if (svg) {
    return (
      <figure className="my-8 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background p-4 shadow-sm">
        <div
          className="overflow-x-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </figure>
    );
  }

  return (
    <figure className="my-8 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background p-4 shadow-sm">
      <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
        Rendering diagram...
      </div>
    </figure>
  );
}
