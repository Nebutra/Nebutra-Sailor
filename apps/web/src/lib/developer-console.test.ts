import { describe, expect, it } from "vitest";
import { DEVELOPER_CONSOLE_LINKS } from "./developer-console";

describe("developer console hub", () => {
  it("only links to existing settings routes", () => {
    expect(DEVELOPER_CONSOLE_LINKS.map((link) => link.href)).toEqual([
      "/settings/api-keys",
      "/settings/webhooks",
      "/settings/provider-keys",
    ]);
    expect(DEVELOPER_CONSOLE_LINKS.every((link) => link.href.startsWith("/settings/"))).toBe(true);
  });
});
