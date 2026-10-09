import { describe, expect, it } from "vitest";
import { publicHead } from "./head";

describe("publicHead", () => {
  it("emits canonical, hreflang, OG and theme metadata for the zh benchmark", () => {
    const head = publicHead("benchmark", "zh");
    expect(head.htmlAttrs).toEqual({ lang: "zh-Hans" });
    expect(head.link).toContainEqual({
      rel: "canonical",
      href: "https://kcq.nebutra.com/zh/benchmark",
    });
    const hreflangs = head.link.flatMap((link) => ("hreflang" in link ? [link.hreflang] : []));
    expect(hreflangs).toEqual(["en", "zh-Hans", "x-default"]);
    const meta = (key: string) =>
      head.meta.filter((tag) => ("name" in tag ? tag.name : tag.property) === key);
    expect(meta("og:url")[0]?.content).toBe("https://kcq.nebutra.com/zh/benchmark");
    expect(meta("og:locale")[0]?.content).toBe("zh_CN");
    expect(meta("og:locale:alternate").map((tag) => tag.content)).toEqual(["en_US"]);
    expect(meta("theme-color")).toHaveLength(2);
    expect(meta("color-scheme")[0]?.content).toBe("light dark");
    expect(meta("description")[0]?.content).toBe(meta("og:description")[0]?.content);
  });

  it("keeps every page title and description distinct per locale", () => {
    const titles = (["home", "benchmark"] as const).flatMap((page) =>
      (["en", "zh"] as const).map((locale) => publicHead(page, locale).title),
    );
    expect(new Set(titles).size).toBe(4);
  });
});
