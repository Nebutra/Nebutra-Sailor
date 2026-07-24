"use client";

import { useTheme } from "@nebutra/tokens";
import { useEffect, useRef, useState } from "react";

export function MermaidDiagram({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;
    import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: resolvedTheme === "dark" ? "dark" : "neutral",
        fontFamily: "var(--font-inter)",
      });
      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
      mermaid.render(id, chart).then(({ svg: renderedSvg }) => {
        if (!cancelled) setSvg(renderedSvg);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [chart, resolvedTheme]);

  if (!svg) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        Loading diagram...
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="mermaid-container [&_svg]:mx-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
