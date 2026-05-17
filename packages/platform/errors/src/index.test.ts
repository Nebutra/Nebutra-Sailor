import { describe, expect, it } from "vitest";
import { CapabilityError, toApiError } from "./index";

describe("CapabilityError", () => {
  it("serializes a suggestion for API callers", () => {
    const error = new CapabilityError("provider-registry", "Missing local model", {
      suggestion: "Run provider-registry:doctor and install a local model.",
      metadata: { provider: "ollama" },
    });

    expect(error.capability).toBe("provider-registry");
    expect(error.suggestion).toContain("provider-registry:doctor");
    expect(error.toJSON()).toMatchObject({
      code: "EXTERNAL_SERVICE_ERROR",
      suggestion: "Run provider-registry:doctor and install a local model.",
      metadata: { capability: "provider-registry", provider: "ollama" },
    });
    expect(toApiError(error).error.details).toMatchObject({
      suggestion: "Run provider-registry:doctor and install a local model.",
    });
  });
});
