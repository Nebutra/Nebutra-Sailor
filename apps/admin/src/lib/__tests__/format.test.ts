import { describe, expect, it } from "vitest";
import { cellText, environmentLabel, relativeTime, statusTone } from "../format";

describe("renderer helpers", () => {
  it("renders a status column as text with a tone that never guesses green", () => {
    expect(cellText({ kind: "status" }, "healthy")).toBe("healthy");
    expect(statusTone("healthy")).toBe("ok");
    expect(statusTone("expired")).toBe("warn");
    expect(statusTone("down")).toBe("bad");
    expect(statusTone("configured")).toBe("unknown");
    expect(statusTone(undefined)).toBe("unknown");
  });

  it("formats numbers, times and empties by kind", () => {
    const now = Date.parse("2026-09-08T10:00:00Z");
    expect(cellText({ kind: "number" }, 18402)).toBe("18,402");
    expect(cellText({ kind: "time" }, "2026-09-08T09:59:48Z", now)).toBe("12 s ago");
    expect(cellText({ kind: "mono" }, null)).toBe("—");
    expect(cellText({ kind: "text" }, ["gpt-5", "gpt-5-codex"])).toBe("gpt-5, gpt-5-codex");
  });

  it("relative time steps through s / min / h / d and handles the future", () => {
    const now = Date.parse("2026-09-08T10:00:00Z");
    expect(relativeTime("2026-09-08T09:57:00Z", now)).toBe("3 min ago");
    expect(relativeTime("2026-09-08T07:00:00Z", now)).toBe("3 h ago");
    expect(relativeTime("2026-09-02T10:00:00Z", now)).toBe("6 d ago");
    expect(relativeTime("2026-09-08T10:04:00Z", now)).toBe("in 4 min");
    expect(relativeTime(null, now)).toBe("—");
  });

  it("labels the environment from NEBUTRA_ENV first, NODE_ENV second", () => {
    expect(environmentLabel({ NEBUTRA_ENV: "staging" })).toBe("staging");
    expect(environmentLabel({ NODE_ENV: "production" })).toBe("production");
    expect(environmentLabel({})).toBe("development");
  });
});
