import { describe, expect, it } from "vitest";
import { assertPublicDisclosureSafe, scanForSensitiveFields } from "./index";

describe("ecosystem-safety", () => {
  it("detects emails and token-like secrets deterministically", () => {
    expect(
      scanForSensitiveFields("Contact alice@example.com with api key sk-test-1234567890."),
    ).toEqual([
      { kind: "email", value: "alice@example.com" },
      { kind: "secret", value: "sk-test-1234567890" },
    ]);
  });

  it("rejects public disclosure when sensitive fields have no explicit redaction", () => {
    expect(() =>
      assertPublicDisclosureSafe({
        capability: "idea-plaza",
        content: "customer bob@example.com uses token-api-12345678",
      }),
    ).toThrow(expect.objectContaining({ capability: "idea-plaza" }));
  });

  it("returns detected fields when the caller provides explicit redaction intent", () => {
    expect(
      assertPublicDisclosureSafe({
        capability: "founder-cemetery",
        content: "customer bob@example.com",
        redactions: ["customers"],
      }),
    ).toEqual([{ kind: "email", value: "bob@example.com" }]);
  });
});
