import { describe, expect, it } from "vitest";
import { RuntimeToolRegistry, ToolRegistry } from "./tools";

describe("runtime tool registry naming", () => {
  it("uses RuntimeToolRegistry as the canonical dispatcher name while preserving ToolRegistry compatibility", () => {
    const runtimeRegistry = new RuntimeToolRegistry();
    const compatRegistry = new ToolRegistry();

    expect(runtimeRegistry).toBeInstanceOf(RuntimeToolRegistry);
    expect(compatRegistry).toBeInstanceOf(RuntimeToolRegistry);
  });
});
