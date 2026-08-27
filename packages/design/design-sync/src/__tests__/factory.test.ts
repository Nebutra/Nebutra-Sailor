import { describe, expect, it } from "vitest";
import { createDesignSync } from "../factory";
import { DesignMdProvider } from "../providers/design-md";

describe("factory.createDesignSync — design-md", () => {
  it("resolves to a DesignMdProvider instance when provider is 'design-md'", async () => {
    const provider = await createDesignSync({ provider: "design-md" });
    expect(provider).toBeInstanceOf(DesignMdProvider);
  });

  it("provider.name is 'design-md'", async () => {
    const provider = await createDesignSync({ provider: "design-md" });
    expect(provider.name).toBe("design-md");
  });

  it("honors explicit designMdPath and tokensDir from config", async () => {
    const designMdPath = "/tmp/test-design.md";
    const tokensDir = "/tmp/test-tokens";
    const provider = await createDesignSync({ provider: "design-md", designMdPath, tokensDir });
    expect(provider).toBeInstanceOf(DesignMdProvider);
    expect(provider.name).toBe("design-md");
  });
});
