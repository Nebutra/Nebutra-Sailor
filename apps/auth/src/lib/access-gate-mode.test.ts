import { describe, expect, it } from "vitest";
import { isAccessGateEnabled } from "./access-gate-mode";

describe("isAccessGateEnabled", () => {
  it("is off unless either public or server env is invite", () => {
    expect(isAccessGateEnabled({})).toBe(false);
    expect(isAccessGateEnabled({ ACCESS_GATE_MODE: "open" })).toBe(false);
    expect(isAccessGateEnabled({ ACCESS_GATE_MODE: "invite" })).toBe(true);
    expect(isAccessGateEnabled({ NEXT_PUBLIC_ACCESS_GATE_MODE: "invite" })).toBe(true);
  });
});
