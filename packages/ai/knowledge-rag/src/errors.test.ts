import { describe, expect, it } from "vitest";
import { KnowledgeRagError } from "./errors";

describe("KnowledgeRagError", () => {
  it("carries a how-to-fix suggestion", () => {
    const err = new KnowledgeRagError("boom", {
      suggestion: "do the thing",
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("boom");
    expect(err.suggestion).toBe("do the thing");
    expect(err.name).toBe("KnowledgeRagError");
  });

  it("always has a non-empty suggestion (defaults if omitted)", () => {
    const err = new KnowledgeRagError("oops");
    expect(err.suggestion.length).toBeGreaterThan(0);
  });

  it("serialises suggestion in toJSON", () => {
    const err = new KnowledgeRagError("x", { suggestion: "y", code: "E_X" });
    const json = err.toJSON();
    expect(json).toMatchObject({ message: "x", suggestion: "y", code: "E_X" });
  });
});
