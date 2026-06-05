/**
 * validateStructured — the AJV recheck behind generateStructured. The provider
 * call is integration-covered; here we pin the pure schema-validation contract
 * (the defense-in-depth recheck of a model's structured output).
 */

import { describe, expect, it } from "vitest";
import { validateStructured } from "../sdk/structured";

const schema = {
  type: "object",
  properties: {
    city: { type: "string" },
    temp: { type: "number" },
  },
  required: ["city", "temp"],
  additionalProperties: false,
} as const;

describe("validateStructured", () => {
  it("accepts a value that matches the schema", () => {
    expect(() => validateStructured({ city: "SF", temp: 18 }, { ...schema })).not.toThrow();
  });

  it("throws on a missing required field", () => {
    expect(() => validateStructured({ city: "SF" }, { ...schema })).toThrow(/schema validation/i);
  });

  it("throws on a wrong type", () => {
    expect(() => validateStructured({ city: "SF", temp: "hot" }, { ...schema })).toThrow(
      /schema validation/i,
    );
  });

  it("throws on an extra property when additionalProperties is false", () => {
    expect(() => validateStructured({ city: "SF", temp: 18, extra: 1 }, { ...schema })).toThrow(
      /schema validation/i,
    );
  });

  it("tolerates a lenient tenant schema (unknown format) without strict errors", () => {
    const lenient = { type: "object", properties: { id: { type: "string", format: "uuid-ish" } } };
    expect(() => validateStructured({ id: "x" }, lenient)).not.toThrow();
  });
});
