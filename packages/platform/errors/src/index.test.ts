import { describe, expect, it } from "vitest";
import { CapabilityError, toApiError } from "./index";

describe("CapabilityError", () => {
  it("serializes a suggestion for API callers", () => {
    const error = new CapabilityError("knowledge-rag", "Missing local model", {
      suggestion: "Run knowledge-rag:doctor and install a local model.",
      metadata: { provider: "ollama" },
    });

    expect(error.capability).toBe("knowledge-rag");
    expect(error.suggestion).toContain("knowledge-rag:doctor");
    expect(error.toJSON()).toMatchObject({
      code: "EXTERNAL_SERVICE_ERROR",
      suggestion: "Run knowledge-rag:doctor and install a local model.",
      metadata: { capability: "knowledge-rag", provider: "ollama" },
    });
    expect(toApiError(error).error.details).toMatchObject({
      suggestion: "Run knowledge-rag:doctor and install a local model.",
    });
  });
});
