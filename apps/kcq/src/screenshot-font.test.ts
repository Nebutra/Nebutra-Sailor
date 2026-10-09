import { describe, expect, it, vi } from "vitest";
import { scheduleScreenshotFont } from "./screenshot-font";

describe("scheduleScreenshotFont", () => {
  it("defers the font CSS to idle time", () => {
    const load = vi.fn(() => Promise.resolve());
    let idle: (() => void) | undefined;
    const target = {
      setTimeout: vi.fn(),
      requestIdleCallback: vi.fn((cb: () => void) => {
        idle = cb;
        return 1;
      }),
    };
    scheduleScreenshotFont(load, target as never);
    expect(load).not.toHaveBeenCalled();
    idle?.();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("falls back to a timer where requestIdleCallback is missing", () => {
    const load = vi.fn(() => Promise.resolve());
    const target = {
      setTimeout: vi.fn((cb: () => void) => {
        cb();
        return 1;
      }),
    };
    scheduleScreenshotFont(load, target as never);
    expect(target.setTimeout).toHaveBeenCalledWith(expect.any(Function), 2_000);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("swallows a failed load so the workbench keeps running", async () => {
    const load = vi.fn(() => Promise.reject(new Error("offline")));
    const target = {
      setTimeout: vi.fn((cb: () => void) => {
        cb();
        return 1;
      }),
    };
    expect(() => scheduleScreenshotFont(load, target as never)).not.toThrow();
    await Promise.resolve();
  });
});
