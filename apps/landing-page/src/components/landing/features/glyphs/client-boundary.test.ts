import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const glyphDir = path.join(process.cwd(), "src/components/landing/features/glyphs");
const integrationsGlyphModules = [
  "admin-tooling-glyph",
  "cache-glyph",
  "collab-glyph",
  "email-glyph",
  "event-bus-glyph",
  "integration-vault-glyph",
  "notifications-glyph",
  "onboarding-glyph",
  "queue-glyph",
  "saga-glyph",
  "search-glyph",
  "sms-glyph",
  "storage-glyph",
  "tts-glyph",
  "uploads-glyph",
  "video-compose-glyph",
  "webhooks-glyph",
] as const;

describe("subpackage glyph client boundary", () => {
  it("keeps every registered glyph as a Client Component", () => {
    for (const moduleName of integrationsGlyphModules) {
      const source = readFileSync(path.join(glyphDir, `${moduleName}.tsx`), "utf8").trimStart();

      expect(source.startsWith('"use client";'), moduleName).toBe(true);
    }
  });
});
