import { describe, expect, it } from "vitest";
import {
  generateRobotsTxt,
  type RobotsTxtGeneratorInput,
  robotsTxtGeneratorInputSchema,
  robotsTxtGeneratorTool,
} from "./w3-robots-txt-generator";

/** Parse through the real schema so defaults are applied exactly as at invoke time. */
function run(input: unknown): ReturnType<typeof generateRobotsTxt> {
  const parsed = robotsTxtGeneratorInputSchema.parse(input) as RobotsTxtGeneratorInput;
  return generateRobotsTxt(parsed);
}

function codes(output: ReturnType<typeof generateRobotsTxt>): string[] {
  return output.warnings.map((w) => w.code);
}

describe("robots-txt-generator — definition", () => {
  it("declares the ship-gate metadata", () => {
    expect(robotsTxtGeneratorTool.id).toBe("dev/robots-txt-generator");
    expect(robotsTxtGeneratorTool.slug).toBe("robots-txt-generator");
    expect(robotsTxtGeneratorTool.sideEffect).toBe("pure");
    expect(robotsTxtGeneratorTool.meterId).toBe("forge.dev.robots_txt_generator");
    expect(robotsTxtGeneratorTool.roots).toContain("template");
    expect(robotsTxtGeneratorTool.engine.upstream).toContain("RFC 9309");
  });

  it("is deterministic — same input, byte-identical output", () => {
    const input = {
      defaultAccess: "allow",
      rules: [{ path: "/admin/", type: "disallow" }],
      bots: [
        { name: "GPTBot", access: "disallow" },
        { name: "Googlebot", access: "allow" },
      ],
      sitemaps: ["https://example.com/sitemap.xml"],
      crawlDelay: 10,
    };
    expect(run(input).content).toBe(run(input).content);
  });
});

describe("robots-txt-generator — RFC 9309 serialization", () => {
  it("allow-all default emits an EMPTY Disallow, never 'Disallow: /'", () => {
    // RFC 9309 §2.2.2: an empty Disallow value matches no path → allow everything.
    const out = run({ defaultAccess: "allow" });
    expect(out.content).toBe("User-agent: *\nDisallow:\n");
    expect(out.content).not.toContain("Disallow: /");
    expect(codes(out)).toContain("empty_disallow_allows_all");
  });

  it("disallow-all default emits 'Disallow: /' and warns that crawling != indexing", () => {
    const out = run({ defaultAccess: "disallow" });
    expect(out.content).toBe("User-agent: *\nDisallow: /\n");
    expect(codes(out)).toContain("deny_all");
  });

  it("groups all directives for one agent under a single User-agent block", () => {
    const out = run({
      rules: [
        { path: "/admin/", type: "disallow" },
        { path: "/tmp/", type: "disallow" },
        { path: "/admin/public/", type: "allow" },
      ],
    });
    expect(out.content).toBe(
      ["User-agent: *", "Allow: /admin/public/", "Disallow: /admin/", "Disallow: /tmp/", ""].join(
        "\n",
      ),
    );
    // one group, not one User-agent line per rule
    expect(out.content.match(/User-agent:/g)).toHaveLength(1);
  });

  it("emits Sitemap as standalone lines outside every group", () => {
    const out = run({
      sitemaps: ["https://example.com/sitemap.xml", "https://example.com/news.xml"],
      bots: [{ name: "GPTBot", access: "disallow" }],
    });
    const lines = out.content.split("\n");
    const sitemapIndex = lines.indexOf("Sitemap: https://example.com/sitemap.xml");
    expect(sitemapIndex).toBeGreaterThan(-1);
    // blank line before it → not part of the preceding group
    expect(lines[sitemapIndex - 1]).toBe("");
    expect(lines[sitemapIndex + 1]).toBe("Sitemap: https://example.com/news.xml");
    expect(out.sitemaps).toHaveLength(2);
  });

  it("merges agents that share an identical rule set into one group", () => {
    const out = run({
      bots: [
        { name: "GPTBot", access: "disallow" },
        { name: "CCBot", access: "disallow" },
        { name: "Bytespider", access: "disallow" },
      ],
    });
    expect(out.content).toBe(
      [
        "User-agent: *",
        "Disallow:",
        "",
        "User-agent: GPTBot",
        "User-agent: CCBot",
        "User-agent: Bytespider",
        "Disallow: /",
        "",
      ].join("\n"),
    );
    expect(out.groups).toHaveLength(2);
  });
});

describe("robots-txt-generator — domain know-how", () => {
  it("repeats shared restrictions into an explicitly allowed bot's group (groups are exclusive)", () => {
    // A crawler obeys only the most specific matching group (RFC 9309 §2.2.1),
    // so a naive `User-agent: Googlebot / Disallow:` would drop /admin/ for it.
    const out = run({
      rules: [{ path: "/admin/", type: "disallow" }],
      bots: [{ name: "Googlebot", access: "allow" }],
    });
    const googleBlock = out.groups.find((g) => g.userAgents.includes("Googlebot"));
    expect(googleBlock?.directives).toEqual(["Disallow: /admin/"]);
    expect(codes(out)).toContain("group_precedence");
  });

  it("an allowed bot with no shared rules still gets a complete group", () => {
    const out = run({ bots: [{ name: "Bingbot", access: "allow" }] });
    expect(out.content).toContain("User-agent: Bingbot\nDisallow:\n");
  });

  it("never puts Crawl-delay in a Google-family group", () => {
    const out = run({
      crawlDelay: 10,
      bots: [
        { name: "Googlebot", access: "allow" },
        { name: "Bingbot", access: "allow" },
      ],
    });
    const google = out.groups.find((g) => g.userAgents.includes("Googlebot"));
    const bing = out.groups.find((g) => g.userAgents.includes("Bingbot"));
    expect(google?.directives.some((d) => d.startsWith("Crawl-delay"))).toBe(false);
    expect(bing?.directives).toContain("Crawl-delay: 10");
    expect(codes(out)).toContain("crawl_delay_google_skipped");
    expect(codes(out)).toContain("crawl_delay_support");
  });

  it("Google-Extended counts as Google family for crawl-delay", () => {
    const out = run({ crawlDelay: 5, bots: [{ name: "Google-Extended", access: "allow" }] });
    const group = out.groups.find((g) => g.userAgents.includes("Google-Extended"));
    expect(group?.directives.some((d) => d.startsWith("Crawl-delay"))).toBe(false);
  });

  it("keeps fractional crawl-delay verbatim", () => {
    const out = run({ crawlDelay: 0.5 });
    expect(out.content).toContain("Crawl-delay: 0.5");
  });

  it("does NOT lower-case paths — path matching is case-sensitive", () => {
    const out = run({ rules: [{ path: "/Admin/Private/", type: "disallow" }] });
    expect(out.content).toContain("Disallow: /Admin/Private/");
  });

  it("adds the missing leading slash but never the missing trailing slash", () => {
    const out = run({ rules: [{ path: "admin", type: "disallow" }] });
    expect(out.content).toContain("Disallow: /admin");
    expect(out.content).not.toContain("Disallow: /admin/");
    const warning = out.warnings.find((w) => w.code === "missing_trailing_slash");
    expect(warning?.subject).toBe("/admin");
    expect(warning?.severity).toBe("warning");
  });

  it("gives a wildcard rule the leading slash RFC 9309 requires", () => {
    // path-pattern = "/" *UTF8-char-noctl (§2.2.2). `*.pdf` is the shorthand
    // people type; `/*.pdf` is the conformant spelling and matches the same
    // URLs, since "*" also matches "/".
    const out = run({ rules: [{ path: "*.pdf$", type: "disallow" }] });
    expect(out.content).toContain("Disallow: /*.pdf$");
    for (const line of out.content.split("\n")) {
      if (line.startsWith("Disallow: ") && line !== "Disallow:") {
        expect(line.slice("Disallow: ".length).startsWith("/")).toBe(true);
      }
      if (line.startsWith("Allow: ")) {
        expect(line.slice("Allow: ".length).startsWith("/")).toBe(true);
      }
    }
  });

  it("does not raise the trailing-slash flag for files, wildcards or anchors", () => {
    const out = run({
      rules: [
        { path: "/private.html", type: "disallow" },
        { path: "/*.pdf$", type: "disallow" },
        { path: "/tmp/", type: "disallow" },
      ],
    });
    expect(codes(out)).not.toContain("missing_trailing_slash");
  });

  it("flags '*' and '$' as pattern extensions", () => {
    const out = run({ rules: [{ path: "/*.pdf$", type: "disallow" }] });
    expect(codes(out)).toContain("pattern_extension");
  });

  it("flags Allow as an extension that predates RFC 9309", () => {
    const out = run({ rules: [{ path: "/public/", type: "allow" }] });
    const warning = out.warnings.find((w) => w.code === "allow_support");
    expect(warning?.message).toContain("RFC 9309");
  });

  it("canonicalizes known agent casing (matching is case-insensitive)", () => {
    const out = run({ bots: [{ name: "gptbot", access: "disallow" }] });
    expect(out.content).toContain("User-agent: GPTBot");
  });

  it("keeps an unknown agent's casing untouched", () => {
    const out = run({ bots: [{ name: "MyCorpBot", access: "disallow" }] });
    expect(out.content).toContain("User-agent: MyCorpBot");
  });

  it("notes redundancy when disallow paths sit under a deny-all default", () => {
    const out = run({
      defaultAccess: "disallow",
      rules: [{ path: "/admin/", type: "disallow" }],
    });
    expect(out.content).toContain("Disallow: /\n");
    expect(out.content).not.toContain("Disallow: /admin/");
    expect(codes(out)).toContain("redundant_disallow_under_deny_all");
  });

  it("drops duplicate rules, agents and sitemaps", () => {
    const out = run({
      rules: [
        { path: "/admin/", type: "disallow" },
        { path: "admin/", type: "disallow" },
      ],
      bots: [
        { name: "GPTBot", access: "disallow" },
        { name: "gptbot", access: "disallow" },
      ],
      sitemaps: ["https://example.com/sitemap.xml", "https://example.com/sitemap.xml"],
    });
    expect(out.content.match(/Disallow: \/admin\//g)).toHaveLength(1);
    expect(out.content.match(/User-agent: GPTBot/g)).toHaveLength(1);
    expect(out.sitemaps).toEqual(["https://example.com/sitemap.xml"]);
    expect(codes(out)).toEqual(
      expect.arrayContaining(["duplicate_rule", "duplicate_agent", "duplicate_sitemap"]),
    );
  });

  it("reports byte length and line count of the rendered file", () => {
    const out = run({ defaultAccess: "allow" });
    // "User-agent: *\nDisallow:\n" → 24 ASCII bytes, 2 lines
    expect(out.content).toHaveLength(24);
    expect(out.byteLength).toBe(24);
    expect(out.lineCount).toBe(2);
    expect(out.filename).toBe("robots.txt");
  });
});

describe("robots-txt-generator — rejections", () => {
  it("rejects a newline in a path (directive injection)", () => {
    expect(() => run({ rules: [{ path: "/a\nDisallow: /", type: "disallow" }] })).toThrow(
      /control characters/,
    );
  });

  it("rejects a newline in an agent name", () => {
    expect(() => run({ bots: [{ name: "Bad\nUser-agent: *", access: "disallow" }] })).toThrow(
      /control characters/,
    );
  });

  it("rejects whitespace and '#' inside a path", () => {
    expect(() => run({ rules: [{ path: "/my dir/", type: "disallow" }] })).toThrow(
      /percent-encoded/,
    );
    expect(() => run({ rules: [{ path: "/a#b", type: "disallow" }] })).toThrow(/percent-encoded/);
  });

  it("rejects a colon or whitespace in an agent name", () => {
    expect(() => run({ bots: [{ name: "Bad: Bot", access: "disallow" }] })).toThrow(/user-agent/);
  });

  it("rejects a relative sitemap URL", () => {
    expect(() => run({ sitemaps: ["/sitemap.xml"] })).toThrow(/absolute http\(s\) URL/);
  });

  it("rejects a non-http sitemap scheme", () => {
    expect(() => run({ sitemaps: ["ftp://example.com/sitemap.xml"] })).toThrow(/http or https/);
  });

  it("rejects '*' listed as a bot — that is what defaultAccess is for", () => {
    expect(() => run({ bots: [{ name: "*", access: "disallow" }] })).toThrow(/defaultAccess/);
  });

  it("rejects conflicting access for the same agent", () => {
    expect(() =>
      run({
        bots: [
          { name: "GPTBot", access: "allow" },
          { name: "gptbot", access: "disallow" },
        ],
      }),
    ).toThrow(/conflicting access/);
  });

  it("rejects a whitespace-only path", () => {
    expect(() => run({ rules: [{ path: "   ", type: "disallow" }] })).toThrow(/must not be empty/);
  });
});

describe("robots-txt-generator — schema", () => {
  it("applies the documented defaults", () => {
    const parsed = robotsTxtGeneratorInputSchema.parse({});
    expect(parsed).toEqual({ defaultAccess: "allow", sitemaps: [], bots: [], rules: [] });
  });

  it("defaults a rule to disallow and a bot to 'default'", () => {
    const parsed = robotsTxtGeneratorInputSchema.parse({
      rules: [{ path: "/x/" }],
      bots: [{ name: "GPTBot" }],
    });
    expect(parsed.rules[0]?.type).toBe("disallow");
    expect(parsed.bots[0]?.access).toBe("default");
  });

  it("a bot left at 'default' emits no group", () => {
    const out = run({ bots: [{ name: "GPTBot", access: "default" }] });
    expect(out.content).toBe("User-agent: *\nDisallow:\n");
    expect(out.groups).toHaveLength(1);
  });

  it("rejects an unknown defaultAccess value", () => {
    expect(robotsTxtGeneratorInputSchema.safeParse({ defaultAccess: "maybe" }).success).toBe(false);
  });

  it("rejects an unknown rule type", () => {
    expect(
      robotsTxtGeneratorInputSchema.safeParse({ rules: [{ path: "/a/", type: "block" }] }).success,
    ).toBe(false);
  });

  it("rejects a non-numeric or out-of-range crawlDelay", () => {
    expect(robotsTxtGeneratorInputSchema.safeParse({ crawlDelay: "10" }).success).toBe(false);
    expect(robotsTxtGeneratorInputSchema.safeParse({ crawlDelay: 0 }).success).toBe(false);
    expect(robotsTxtGeneratorInputSchema.safeParse({ crawlDelay: 100_000 }).success).toBe(false);
  });

  it("rejects an empty rule path and an empty bot name", () => {
    expect(robotsTxtGeneratorInputSchema.safeParse({ rules: [{ path: "" }] }).success).toBe(false);
    expect(robotsTxtGeneratorInputSchema.safeParse({ bots: [{ name: "" }] }).success).toBe(false);
  });

  it("caps list sizes", () => {
    const many = Array.from({ length: 201 }, (_, i) => ({ path: `/p${i}/` }));
    expect(robotsTxtGeneratorInputSchema.safeParse({ rules: many }).success).toBe(false);
  });
});

describe("robots-txt-generator — the 2026 AI-crawler journey", () => {
  it("blocks the AI crawlers while keeping search engines on the default group", () => {
    const out = run({
      defaultAccess: "allow",
      rules: [{ path: "/admin/", type: "disallow" }],
      sitemaps: ["https://example.com/sitemap.xml"],
      bots: [
        { name: "GPTBot", access: "disallow" },
        { name: "ClaudeBot", access: "disallow" },
        { name: "Google-Extended", access: "disallow" },
        { name: "PerplexityBot", access: "disallow" },
        { name: "Googlebot", access: "default" },
      ],
    });
    expect(out.content).toBe(
      [
        "User-agent: *",
        "Disallow: /admin/",
        "",
        "User-agent: GPTBot",
        "User-agent: ClaudeBot",
        "User-agent: Google-Extended",
        "User-agent: PerplexityBot",
        "Disallow: /",
        "",
        "Sitemap: https://example.com/sitemap.xml",
        "",
      ].join("\n"),
    );
    expect(out.content).not.toContain("User-agent: Googlebot");
  });
});
