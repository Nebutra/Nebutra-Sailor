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
          securityLevel: "strict",
          startOnLoad: false,
          theme: "base",
          themeVariables: {
            background: "transparent",
            edgeLabelBackground: "var(--neutral-1)",
            lineColor: "var(--neutral-8)",
            mainBkg: "var(--neutral-2)",
            nodeBorder: "var(--neutral-7)",
            primaryBorderColor: "var(--neutral-7)",
            primaryColor: "var(--neutral-2)",
            primaryTextColor: "var(--neutral-12)",
            secondaryColor: "var(--blue-3)",
            tertiaryColor: "var(--neutral-3)",
            textColor: "var(--neutral-12)",
          },
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
      <figure className="my-8 rounded-[var(--radius-lg)] border border-[var(--red-6)] bg-[var(--red-2)] p-4">
        <figcaption className="text-sm font-semibold text-[var(--red-11)]">
          Mermaid diagram could not render
        </figcaption>
        <pre className="mt-3 overflow-x-auto rounded-[var(--radius-md)] bg-[var(--neutral-1)] p-3 font-mono text-xs leading-6 text-[var(--neutral-11)]">
          {trimmedChart}
        </pre>
      </figure>
    );
  }

  if (svg) {
    return (
      <figure className="my-8 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-4 shadow-sm">
        <div
          className="overflow-x-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </figure>
    );
  }

  return (
    <figure className="my-8 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] p-4 shadow-sm">
      <div className="flex min-h-40 items-center justify-center text-sm text-[var(--neutral-10)]">
        Rendering diagram...
      </div>
    </figure>
  );
}
