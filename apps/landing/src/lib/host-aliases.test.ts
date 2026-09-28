import { describe, expect, it } from "vitest";
import { type HostAlias, routeHost } from "./host-aliases";

const APEX = "example.com";
const ALIASES: HostAlias[] = [
  {
    host: "status.example.com",
    section: "status",
    subPaths: /^(incidents\/[^/]+|history|subscription)$/,
    canonical: "host",
  },
  { host: "open.example.com", section: "open", canonical: "apex" },
];
const LOCALES = ["en", "zh-Hans", "ja"];

const route = (host: string, pathname: string, search = "") =>
  routeHost({
    host,
    pathname,
    search,
    apex: APEX,
    aliases: ALIASES,
    locales: LOCALES,
    defaultLocale: "en",
  });

describe("routeHost", () => {
  it("serves the status section at its host root and its sub-pages", () => {
    expect(route("status.example.com", "/")).toEqual({ kind: "rewrite", pathname: "/status" });
    expect(route("status.example.com", "/zh-Hans")).toEqual({
      kind: "rewrite",
      pathname: "/zh-Hans/status",
    });
    expect(route("status.example.com", "/history")).toEqual({
      kind: "rewrite",
      pathname: "/status/history",
    });
    expect(route("status.example.com", "/ja/incidents/abc")).toEqual({
      kind: "rewrite",
      pathname: "/ja/status/incidents/abc",
    });
  });

  it("sends every other path on the status host to the apex — no second copy of the site", () => {
    expect(route("status.example.com", "/roadmap")).toEqual({
      kind: "redirect",
      url: "https://example.com/roadmap",
    });
    expect(route("status.example.com", "/zh-Hans/pricing", "?a=1")).toEqual({
      kind: "redirect",
      url: "https://example.com/zh-Hans/pricing?a=1",
    });
  });

  it("drops a redundant /status on the status host", () => {
    expect(route("status.example.com", "/status/history")).toEqual({
      kind: "redirect",
      url: "https://status.example.com/history",
    });
  });

  it("hands the apex's copy of the status page to its host", () => {
    expect(route("example.com", "/status")).toEqual({
      kind: "redirect",
      url: "https://status.example.com/",
    });
    expect(route("www.example.com", "/zh-Hans/status/history")).toEqual({
      kind: "redirect",
      url: "https://status.example.com/zh-Hans/history",
    });
  });

  it("keeps the open page on the apex; its host is only a short name for it", () => {
    expect(route("open.example.com", "/")).toEqual({
      kind: "redirect",
      url: "https://example.com/open",
    });
    expect(route("open.example.com", "/pricing")).toEqual({
      kind: "redirect",
      url: "https://example.com/pricing",
    });
    expect(route("example.com", "/open")).toEqual({ kind: "pass" });
  });

  it("leaves local and preview hosts alone", () => {
    expect(route("localhost", "/status")).toEqual({ kind: "pass" });
    expect(route("landing-preview.fly.dev", "/status/history")).toEqual({ kind: "pass" });
    expect(route("example.com", "/roadmap")).toEqual({ kind: "pass" });
  });
});
