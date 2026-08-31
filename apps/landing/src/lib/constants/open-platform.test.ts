import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { describe, expect, it } from "vitest";
import {
  OPEN_PLATFORM_CONSOLE_HREF,
  OPEN_PLATFORM_COPY,
  OPEN_PLATFORM_ITEMS,
  resolveOpenPlatformConsoleHref,
  resolveOpenPlatformHref,
} from "./open-platform";

describe("open platform catalog", () => {
  it("indexes existing brand hosts and does not invent a parallel API origin", () => {
    const byId = Object.fromEntries(OPEN_PLATFORM_ITEMS.map((item) => [item.id, item]));

    expect(byId.docs?.href).toBe(getBrandOrigin("docs"));
    expect(byId.api?.href).toBe(getBrandOrigin("api"));
    expect(byId.router?.href).toBe(getBrandOrigin("router"));
    expect(byId.forge?.href).toBe(getBrandOrigin("forge"));
    expect(byId.status?.href).toBe(getBrandOrigin("status"));
    expect(OPEN_PLATFORM_ITEMS.every((item) => !item.href.includes("api.open."))).toBe(true);
  });

  it("sends console mutations to app settings, not the public host", () => {
    const consoleItems = OPEN_PLATFORM_ITEMS.filter((item) => item.group === "console");

    expect(consoleItems.length).toBeGreaterThan(0);
    expect(consoleItems.every((item) => item.app === true)).toBe(true);
    expect(consoleItems.map((item) => item.href)).toEqual(
      expect.arrayContaining([
        "/settings/api-keys",
        "/settings/webhooks",
        "/settings/provider-keys",
      ]),
    );
    expect(OPEN_PLATFORM_CONSOLE_HREF).toBe("/settings/developers");
    expect(resolveOpenPlatformHref(consoleItems[0]!)).toMatch(/\/settings\//);
    expect(resolveOpenPlatformConsoleHref()).toMatch(/\/settings\/developers$/);
  });

  it("names the catalog from brand metadata, not hardcoded identity", () => {
    expect(OPEN_PLATFORM_COPY.title.en).toBe(`${brand.name} Open Platform`);
    expect(OPEN_PLATFORM_COPY.title.zh).toBe(`${brand.nameCn}开放平台`);
    const sso = OPEN_PLATFORM_ITEMS.find((item) => item.id === "sso");
    expect(sso?.title.en).toBe(`Sign in with ${brand.name}`);
    expect(sso?.title.zh).toBe(`使用${brand.nameCn}登录`);
  });
});
