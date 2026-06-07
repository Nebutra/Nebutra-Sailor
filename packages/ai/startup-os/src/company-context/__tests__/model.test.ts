import { describe, expect, it } from "vitest";
import { FieldValueSchema } from "../model";

describe("FieldValueSchema", () => {
  const validValue = {
    layerId: "L1",
    fieldKey: "mission",
    kind: "line",
    value: "Make company-building legible.",
    provenance: "user",
    updatedAt: "2026-06-05T00:00:00.000Z",
  } as const;

  it("parses a valid field value with provenance", () => {
    const parsed = FieldValueSchema.parse(validValue);

    expect(parsed).toMatchObject({
      layerId: "L1",
      fieldKey: "mission",
      kind: "line",
      value: "Make company-building legible.",
      provenance: "user",
      updatedAt: "2026-06-05T00:00:00.000Z",
    });
  });

  it("applies the 'empty' status default when status is omitted", () => {
    const parsed = FieldValueSchema.parse(validValue);

    expect(parsed.status).toBe("empty");
  });

  it("rejects a bad provenance value", () => {
    const result = FieldValueSchema.safeParse({
      ...validValue,
      provenance: "stackoverflow",
    });

    expect(result.success).toBe(false);
  });

  it("accepts an explicit locked status and optional provenance metadata", () => {
    const parsed = FieldValueSchema.parse({
      ...validValue,
      status: "locked",
      confidence: 0.92,
      updatedBy: "agent_42",
      runId: "run_7",
    });

    expect(parsed).toMatchObject({
      status: "locked",
      confidence: 0.92,
      updatedBy: "agent_42",
      runId: "run_7",
    });
  });

  it("rejects a confidence outside the 0..1 range", () => {
    const result = FieldValueSchema.safeParse({ ...validValue, confidence: 1.5 });

    expect(result.success).toBe(false);
  });
});
