import { describe, expect, it } from "vitest";
import { notFoundHead, ogImageUrl, publicHead } from "./head";

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
    const titles = (["home", "benchmark", "investors"] as const).flatMap((page) =>
      (["en", "zh"] as const).map((locale) => publicHead(page, locale).title),
    );
    expect(new Set(titles).size).toBe(6);
  });

  it("points OG and Twitter at the 1200 × 630 card of the page's locale", () => {
    const head = publicHead("home", "zh");
    const meta = (key: string) =>
      head.meta.find((tag) => ("name" in tag ? tag.name : tag.property) === key)?.content;
    expect(meta("og:image")).toBe(ogImageUrl("zh"));
    expect(meta("og:image")).toMatch(/^https:\/\/kcq\.nebutra\.com\/og\/home-zh\.png\?v=[a-z0-9]+$/);
    expect([meta("og:image:width"), meta("og:image:height")]).toEqual(["1200", "630"]);
    expect(meta("og:image:alt")).toBeTruthy();
    expect(meta("twitter:card")).toBe("summary_large_image");
    expect(ogImageUrl("en")).not.toBe(ogImageUrl("zh"));
  });

  it("gives /investors its own card and the benchmark the home card", () => {
    const image = (page: "investors" | "benchmark") =>
      publicHead(page, "en").meta.find((tag) => "property" in tag && tag.property === "og:image")?.content;
    expect(image("investors")).toMatch(/\/og\/investors-en\.png\?v=/);
    expect(image("benchmark")).toBe(ogImageUrl("en"));
  });

  it("keeps 404 pages out of the index with no canonical", () => {
    const head = notFoundHead("en");
    expect(head.meta).toContainEqual({ name: "robots", content: "noindex" });
    expect((head.link as { rel: string }[]).some((link) => link.rel === "canonical")).toBe(false);
  });
});
