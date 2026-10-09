/** Vite handles CSS imports as assets rather than TypeScript modules. */
declare module "*.css";

/** Public-page build inputs from the pinned chart source (scripts/landing-plugin.mjs). */
declare module "virtual:kcq-tokens.css";
declare module "virtual:kcq-presets" {
  interface PreviewPalette {
    accent: string;
    background: string;
    surface: string;
    grid: string;
    axis: string;
    text: string;
    muted: string;
    border: string;
    up: string;
    down: string;
  }
  const presets: Record<
    "pro" | "exchange" | "terminal" | "zen" | "quant",
    Record<"light" | "dark", PreviewPalette>
  >;
  export default presets;
}
declare module "virtual:kcq-facts" {
  interface Fact {
    href: string;
  }
  const facts: {
    commit: string;
    repository: string;
    upstream: string;
    version: string;
    license: string;
    license_href: string;
    tools: Fact & {
      count: number;
      names: string[];
      safety: Record<string, "read-only" | "destructive">;
    };
    backends: Fact & { names: string[] };
    drawingKinds: Fact & { count: number };
    bindings: Fact & { names: string[] };
    presets: Fact & { count: number };
  };
  export default facts;
}
declare module "virtual:kcq-code" {
  /** Build-time Shiki output per developer snippet: the lines inside `<code>`. */
  const code: { id: string; html: string; lines: number }[];
  export default code;
}
declare module "*.webp" {
  const url: string;
  export default url;
}
declare module "*.woff2?url" {
  const url: string;
  export default url;
}
