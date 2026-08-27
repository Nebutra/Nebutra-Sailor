import { describe, expect, it } from "vitest";

import {
  type DesignContext,
  ingestDesignContext,
  normalizeScrapeResult,
  type RawScrapeResult,
  type ScrapeProvider,
  toGenerationSeed,
} from "./design-context.js";

const FIXED_ISO = "2026-05-17T00:00:00.000Z";
const fixedClock = () => new Date(FIXED_ISO);

function fakeProvider(result: RawScrapeResult): ScrapeProvider & {
  calls: Array<{ url: string; formats: string[] }>;
} {
  const calls: Array<{ url: string; formats: string[] }> = [];
  return {
    calls,
    async scrape(url, opts) {
      calls.push({ url, formats: [...opts.formats] });
      return result;
    },
  };
}

describe("normalizeScrapeResult", () => {
  it("prefers markdown over html for content", () => {
    const ctx = normalizeScrapeResult(
      "org_1",
      "https://example.com",
      { markdown: "# Hello MD", html: "<h1>Hello HTML</h1>" },
      { clock: fixedClock },
    );
    expect(ctx.content).toBe("# Hello MD");
  });

  it("strips tags from html when markdown absent", () => {
    const ctx = normalizeScrapeResult(
      "org_1",
      "https://example.com",
      { html: "<div><h1>Title</h1><p>Body &amp; more</p></div>" },
      { clock: fixedClock },
    );
    expect(ctx.content).not.toContain("<");
    expect(ctx.content).toContain("Title");
    expect(ctx.content).toContain("Body");
  });

  it("dedups and validates colors, drops junk", () => {
    const ctx = normalizeScrapeResult(
      "org_1",
      "https://example.com",
      {
        markdown: "x",
        branding: {
          colors: ["#fff", "#fff", "#FFFFFF", "rgb(0,0,0)", "not-a-color", "", "  "],
          fonts: ["Inter", "Inter", "  Roboto  ", ""],
        },
      },
      { clock: fixedClock },
    );
    expect(ctx.brand.colors).toEqual(["#fff", "#FFFFFF", "rgb(0,0,0)"]);
    expect(ctx.brand.fonts).toEqual(["Inter", "Roboto"]);
  });

  it("degrades gracefully on empty raw (no throw, empty brand)", () => {
    const ctx = normalizeScrapeResult("org_1", "https://example.com", {}, { clock: fixedClock });
    expect(ctx.content).toBe("");
    expect(ctx.brand.colors).toEqual([]);
    expect(ctx.brand.fonts).toEqual([]);
    expect(ctx.screenshotRef).toBeUndefined();
    expect(ctx.title).toBeUndefined();
  });

  it("passes screenshot and title through", () => {
    const ctx = normalizeScrapeResult(
      "org_1",
      "https://example.com",
      { markdown: "x", screenshot: "https://cdn/shot.png", metadata: { title: "My Site" } },
      { clock: fixedClock },
    );
    expect(ctx.screenshotRef).toBe("https://cdn/shot.png");
    expect(ctx.title).toBe("My Site");
  });

  it("treats null screenshot as undefined", () => {
    const ctx = normalizeScrapeResult(
      "org_1",
      "https://example.com",
      { markdown: "x", screenshot: null },
      { clock: fixedClock },
    );
    expect(ctx.screenshotRef).toBeUndefined();
  });

  it("uses injectable clock for fetchedAt", () => {
    const ctx = normalizeScrapeResult(
      "org_1",
      "https://example.com",
      { markdown: "x" },
      {
        clock: fixedClock,
      },
    );
    expect(ctx.fetchedAt).toBe(FIXED_ISO);
  });

  it("carries tenantId through", () => {
    const ctx = normalizeScrapeResult(
      "org_xyz",
      "https://example.com",
      { markdown: "x" },
      {
        clock: fixedClock,
      },
    );
    expect(ctx.tenantId).toBe("org_xyz");
  });

  it("fails closed on empty tenantId", () => {
    expect(() =>
      normalizeScrapeResult("", "https://example.com", { markdown: "x" }, { clock: fixedClock }),
    ).toThrow();
  });

  it("fails closed on empty url", () => {
    expect(() =>
      normalizeScrapeResult("org_1", "", { markdown: "x" }, { clock: fixedClock }),
    ).toThrow();
  });
});

describe("ingestDesignContext", () => {
  it("delegates to the injected provider (no real network)", async () => {
    const provider = fakeProvider({ markdown: "seed", metadata: { title: "T" } });
    const ctx = await ingestDesignContext("org_1", "https://example.com", provider, {
      clock: fixedClock,
    });
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0]?.url).toBe("https://example.com");
    expect(ctx.content).toBe("seed");
    expect(ctx.title).toBe("T");
    expect(ctx.tenantId).toBe("org_1");
  });

  it("passes requested formats to provider", async () => {
    const provider = fakeProvider({ markdown: "x" });
    await ingestDesignContext("org_1", "https://example.com", provider, {
      formats: ["markdown", "branding"],
      clock: fixedClock,
    });
    expect(provider.calls[0]?.formats).toEqual(["markdown", "branding"]);
  });

  it("fails closed on empty tenantId", async () => {
    const provider = fakeProvider({ markdown: "x" });
    await expect(
      ingestDesignContext("", "https://example.com", provider, { clock: fixedClock }),
    ).rejects.toThrow();
    expect(provider.calls).toHaveLength(0);
  });
});

describe("toGenerationSeed", () => {
  const base: DesignContext = {
    tenantId: "org_1",
    sourceUrl: "https://example.com",
    content: "Lorem ipsum dolor sit amet ".repeat(500),
    brand: { colors: ["#fff", "rgb(0,0,0)"], fonts: ["Inter"] },
    screenshotRef: undefined,
    title: "Example",
    fetchedAt: FIXED_ISO,
  };

  it("is deterministic", () => {
    expect(toGenerationSeed(base)).toBe(toGenerationSeed(base));
  });

  it("is length-bounded by default", () => {
    expect(toGenerationSeed(base).length).toBeLessThanOrEqual(4000);
  });

  it("respects injectable max chars", () => {
    expect(toGenerationSeed(base, { maxChars: 200 }).length).toBeLessThanOrEqual(200);
  });

  it("includes title, palette and fonts", () => {
    const seed = toGenerationSeed({ ...base, content: "short" });
    expect(seed).toContain("Example");
    expect(seed).toContain("#fff");
    expect(seed).toContain("Inter");
  });
});
