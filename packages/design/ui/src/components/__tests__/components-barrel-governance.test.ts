import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const COMPONENTS_BARREL = join(process.cwd(), "src/components/index.ts");

describe("@nebutra/ui/components barrel governance", () => {
  it("does not import the @lobehub/ui awesome barrel, which eagerly loads Spline", () => {
    const source = readFileSync(COMPONENTS_BARREL, "utf8");

    expect(source).not.toContain('from "@lobehub/ui/awesome"');
    expect(source).toContain("export { default as Spotlight }");
    expect(source).toContain('from "@lobehub/ui/es/awesome/Spotlight/Spotlight"');
  });

  it("does not re-export Lobehub chrome that collides with Nebutra primitives", () => {
    const source = readFileSync(COMPONENTS_BARREL, "utf8");
    const lobehubBlock = source.match(/export \{[\s\S]*?\} from "@lobehub\/ui";/u)?.[0] ?? "";

    expect(lobehubBlock).not.toMatch(/\bButton\b/u);
    expect(lobehubBlock).not.toMatch(/\bInput\b/u);
    expect(lobehubBlock).not.toMatch(/\bModal\b/u);
    expect(lobehubBlock).not.toMatch(/\bTooltip\b/u);
    expect(lobehubBlock).not.toMatch(/\bSelect\b/u);
    expect(lobehubBlock).not.toMatch(/\bCheckbox\b/u);
    expect(lobehubBlock).not.toMatch(/\bAvatar\b/u);
    expect(lobehubBlock).not.toMatch(/\bForm\b/u);
    expect(lobehubBlock).not.toMatch(/\bMenu\b/u);
    expect(lobehubBlock).not.toMatch(/\bTextArea\b/u);
  });

  it("does not re-export Lobehub chat — that surface is @nebutra/ui/chat only", () => {
    const source = readFileSync(COMPONENTS_BARREL, "utf8");

    expect(source).not.toContain('from "@lobehub/ui/chat"');
    expect(source).not.toMatch(/\bChatInputArea\b/u);
    expect(source).not.toMatch(/\bChatItem\b/u);
    expect(source).not.toMatch(/\bChatList\b/u);
    expect(source).not.toMatch(/\bMessageInput\b/u);
    expect(source).not.toMatch(/\bMessageModal\b/u);
  });
});
