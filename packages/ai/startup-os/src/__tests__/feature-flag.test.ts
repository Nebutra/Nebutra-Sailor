import { describe, expect, it } from "vitest";
import { isStartupOSPrototypeEnabled } from "../feature-flag";

describe("isStartupOSPrototypeEnabled", () => {
  it("keeps Startup Agent OS enabled by default outside production for internal iteration", () => {
    expect(isStartupOSPrototypeEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(isStartupOSPrototypeEnabled({ NODE_ENV: "test" })).toBe(true);
    expect(isStartupOSPrototypeEnabled({ NODE_ENV: undefined })).toBe(true);
  });

  it("keeps Startup Agent OS private in production unless the server flag is explicit", () => {
    expect(isStartupOSPrototypeEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(
      isStartupOSPrototypeEnabled({
        NODE_ENV: "production",
        STARTUP_AGENT_OS_PROTOTYPE: "1",
      }),
    ).toBe(true);
    expect(
      isStartupOSPrototypeEnabled({
        NODE_ENV: "production",
        STARTUP_AGENT_OS_PROTOTYPE: "true",
      }),
    ).toBe(false);
  });
});
