import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (slug: string) =>
  readFileSync(
    path.join(process.cwd(), `src/components/landing/features/glyphs/${slug}-glyph.tsx`),
    "utf8",
  );

describe("content-sized feature drawings", () => {
  for (const slug of [
    "agents",
    "permissions",
    "tokens",
    "notifications",
    "agent-runtime",
    "auth",
    "db",
    "knowledge-rag",
    "gateway-core",
  ]) {
    it(`${slug} allows translated and wrapped content to grow`, () => {
      expect(source(slug)).not.toMatch(/height:\s*160/);
    });
  }
  it("keeps the token scale label in document flow", () => {
    expect(source("tokens")).not.toContain("absolute right-2 top-2");
  });
});
