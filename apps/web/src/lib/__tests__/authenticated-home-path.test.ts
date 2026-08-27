import { describe, expect, it } from "vitest";
import {
  FALLBACK_AUTHENTICATED_HOME_PATH,
  resolveAuthenticatedHomePath,
  STARTUP_OS_HOME_PATH,
} from "../authenticated-home-path";

describe("resolveAuthenticatedHomePath", () => {
  it("keeps Startup OS as home outside production", () => {
    expect(resolveAuthenticatedHomePath({ NODE_ENV: "development" })).toBe(STARTUP_OS_HOME_PATH);
    expect(resolveAuthenticatedHomePath({ NODE_ENV: "test" })).toBe(STARTUP_OS_HOME_PATH);
    expect(resolveAuthenticatedHomePath({})).toBe(STARTUP_OS_HOME_PATH);
  });

  it("does not send production logins to a gated-off Startup OS", () => {
    expect(resolveAuthenticatedHomePath({ NODE_ENV: "production" })).toBe(
      FALLBACK_AUTHENTICATED_HOME_PATH,
    );
    expect(FALLBACK_AUTHENTICATED_HOME_PATH).toBe("/integrations");
  });

  it("uses Startup OS as production home only when the prototype flag is explicit", () => {
    expect(
      resolveAuthenticatedHomePath({
        NODE_ENV: "production",
        STARTUP_AGENT_OS_PROTOTYPE: "1",
      }),
    ).toBe(STARTUP_OS_HOME_PATH);
    expect(
      resolveAuthenticatedHomePath({
        NODE_ENV: "production",
        STARTUP_AGENT_OS_PROTOTYPE: "true",
      }),
    ).toBe(FALLBACK_AUTHENTICATED_HOME_PATH);
  });
});
