import { describe, expect, it } from "vitest";
import { KCQ_ORIGIN, matchPublicRoute, PUBLIC_ROUTES, publicAlternates } from "./routes";

describe("public routes", () => {
  it("serves exactly the six indexed pages", () => {
    expect(PUBLIC_ROUTES.map((route) => route.path)).toEqual([
      "/home",
      "/zh/home",
      "/benchmark",
      "/zh/benchmark",
      "/investors",
      "/zh/investors",
    ]);
    expect(KCQ_ORIGIN).toBe("https://kcq.nebutra.com");
  });

  it("matches with or without a trailing slash and nothing else", () => {
    expect(matchPublicRoute("/zh/home/")).toEqual({ path: "/zh/home", page: "home", locale: "zh" });
    expect(matchPublicRoute("/benchmark")?.locale).toBe("en");
    for (const path of ["/", "/app", "/zh", "/en/home", "/settings/profile", "/home.html"]) {
      expect(matchPublicRoute(path), path).toBeUndefined();
    }
  });

  it("gives reciprocal, self-referencing alternates with English as x-default", () => {
    expect(publicAlternates("benchmark")).toEqual([
      { hreflang: "en", href: "https://kcq.nebutra.com/benchmark" },
      { hreflang: "zh-Hans", href: "https://kcq.nebutra.com/zh/benchmark" },
      { hreflang: "x-default", href: "https://kcq.nebutra.com/benchmark" },
    ]);
  });
});
