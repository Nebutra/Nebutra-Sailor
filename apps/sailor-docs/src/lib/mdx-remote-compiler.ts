/**
 * Remote MDX compiler surface.
 *
 * Full `@fumadocs/mdx-remote` + rehype-code + Shiki is intentionally **not**
 * imported here. That chain embeds ~8 MiB of language grammars into the
 * OpenNext Worker and exceeds Cloudflare size limits. The hybrid remote demo
 * route short-circuits on Workers; local/Vercel can re-enable a full compiler
 * later via a separate module if needed.
 */

type Compiler = {
  compile: (opts: { source: string }) => Promise<{
    body: React.ComponentType<{ components?: Record<string, unknown> }>;
    toc?: unknown;
  }>;
};

export const compiler: Compiler = {
  async compile() {
    throw new Error("Remote MDX is disabled in this build (Cloudflare Worker size / Shiki).");
  },
};
