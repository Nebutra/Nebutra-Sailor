import { describe, expect, it } from "vitest";

// Inline re-export path: exercise the tool execute surface through module
// after validateIdCard gains reasonCode (import from same package tests).
import { idCardTool } from "./cn-validate";

describe("cn/id-card reasonCode", () => {
  it("returns check_digit with expectedCheckDigit", () => {
    const out = idCardTool.execute({ id: "110105194912310021" }) as {
      valid: boolean;
      reasonCode?: string;
      expectedCheckDigit?: string;
    };
    expect(out.valid).toBe(false);
    expect(out.reasonCode).toBe("check_digit");
    expect(out.expectedCheckDigit).toMatch(/^[0-9X]$/);
  });

  it("returns format for short input", () => {
    const out = idCardTool.execute({ id: "11010519491231002" }) as {
      valid: boolean;
      reasonCode?: string;
    };
    // min length 15 in schema — 17 digits without check still format-fails in validator
    expect(out.valid).toBe(false);
    expect(out.reasonCode).toBe("format");
  });

  it("valid sample", () => {
    const out = idCardTool.execute({ id: "11010519491231002X" }) as {
      valid: boolean;
      reasonCode?: string;
    };
    expect(out.valid).toBe(true);
    expect(out.reasonCode).toBeUndefined();
  });
});
