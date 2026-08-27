import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const COMPONENTS_BARREL = join(process.cwd(), "src/components/index.ts");

describe("@nebutra/ui/components barrel governance", () => {
  it("does not re-export Lobehub — chrome is /primitives, chat is /chat", () => {
    const source = readFileSync(COMPONENTS_BARREL, "utf8");

    expect(source).not.toMatch(/from ["']@lobehub\/ui/u);
    expect(source).not.toMatch(/\bActionIcon\b/u);
    expect(source).not.toMatch(/\bSearchBar\b/u);
    expect(source).not.toMatch(/\bFlexbox\b/u);
    expect(source).not.toMatch(/\bChatList\b/u);
  });
});
