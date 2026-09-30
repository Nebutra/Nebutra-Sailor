import { getBrandOrigin, getDocsUrl } from "@nebutra/brand/metadata-helpers";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import zhHans from "../../../messages/zh-Hans.json";
import {
  OPEN_PLATFORM_CONSOLE_HREF,
  OPEN_PLATFORM_ITEMS,
  resolveOpenPlatformConsoleHref,
  resolveOpenPlatformHref,
} from "./open-platform";

describe("open platform catalog", () => {
  it("indexes existing brand hosts and does not invent a parallel API origin", () => {
    const byId = Object.fromEntries(OPEN_PLATFORM_ITEMS.map((item) => [item.id, item]));

    expect(byId.docs?.href).toBe(getDocsUrl());
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
    // Copy lives in messages/*.json (openPlatform namespace); the {brandName} /
    // {brandNameCn} tokens are resolved at request time by injectBrandVars, so
    // the raw message text carries the placeholder, not the literal brand name.
    expect(en.openPlatform.title).toBe("{brandName} Open Platform");
    expect(zhHans.openPlatform.title).toBe("{brandNameCn}开放平台");
    expect(en.openPlatform.items.sso.title).toBe("Sign in with {brandName}");
    expect(zhHans.openPlatform.items.sso.title).toBe("使用{brandNameCn}登录");

    const sso = OPEN_PLATFORM_ITEMS.find((item) => item.id === "sso");
    expect(sso?.badge).toBe(true);
  });
});
