import { describe, expect, it } from "vitest";
import { contentTimestamp } from "../lastmod";

describe("contentTimestamp", () => {
  it("keeps a real content clock and drops sentinels", () => {
    expect(contentTimestamp("2026-01-05T00:00:00.000Z")).toBe("2026-01-05T00:00:00.000Z");
    expect(contentTimestamp(new Date(0).toISOString())).toBeUndefined();
    expect(contentTimestamp(undefined)).toBeUndefined();
  });
});
