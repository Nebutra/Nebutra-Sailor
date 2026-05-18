/**
 * Behaviour spec for the zero-LLM typed-edge extractor.
 *
 * The resolver is a hand-written fake (no mock libraries): a slug → pageId
 * dictionary with a configurable resolutionType and a recording log so tests
 * can assert dirHint / mode passthrough. Nothing here touches FS, network,
 * the clock, or randomness — mirroring the package's pure-except-injected-port
 * contract.
 */

import { describe, expect, it } from "vitest";
import type { EntityResolver, ResolvedEntity, ResolveMode } from "./interfaces";
import {
  CONTEXT_WINDOW,
  DEFAULT_DIR_PATTERN,
  DEFAULT_RULES,
  extractLinks,
  FRONTMATTER_LINK_MAP,
} from "./link-extraction";

// ─── Fake resolver ──────────────────────────────────────────────────────────

interface ResolveCall {
  readonly name: string;
  readonly dirHint: readonly string[] | undefined;
  readonly mode: ResolveMode;
}

class FakeResolver implements EntityResolver {
  readonly calls: ResolveCall[] = [];
  constructor(
    private readonly table: Record<string, string>,
    private readonly resolutionType: "qualified" | "unqualified" = "unqualified",
  ) {}

  resolve(
    name: string,
    opts: { dirHint?: readonly string[] | undefined; mode: ResolveMode },
  ): Promise<ResolvedEntity | undefined> {
    this.calls.push({ name, dirHint: opts.dirHint, mode: opts.mode });
    const pageId = this.table[name];
    if (pageId === undefined) return Promise.resolve(undefined);
    return Promise.resolve({ pageId, resolutionType: this.resolutionType });
  }
}

const base = {
  pageId: "people/alice" as const,
  resolver: new FakeResolver({}),
  mode: "batch" as ResolveMode,
};

// ─── Exports / shape ────────────────────────────────────────────────────────

describe("exports", () => {
  it("exposes the calibrated context window", () => {
    expect(CONTEXT_WINDOW).toBe(240);
  });

  it("exposes a sensible default dir whitelist", () => {
    expect(DEFAULT_DIR_PATTERN.test("people")).toBe(true);
    expect(DEFAULT_DIR_PATTERN.test("companies")).toBe(true);
    expect(DEFAULT_DIR_PATTERN.test("funds")).toBe(true);
    expect(DEFAULT_DIR_PATTERN.test("meetings")).toBe(true);
    expect(DEFAULT_DIR_PATTERN.test("media")).toBe(true);
    expect(DEFAULT_DIR_PATTERN.test("secrets")).toBe(false);
  });

  it("ships an overridable rule bundle of verb regexes", () => {
    expect(DEFAULT_RULES.FOUNDED_RE).toBeInstanceOf(RegExp);
    expect(DEFAULT_RULES.INVESTED_RE).toBeInstanceOf(RegExp);
    expect(DEFAULT_RULES.ADVISES_RE).toBeInstanceOf(RegExp);
    expect(DEFAULT_RULES.WORKS_AT_RE).toBeInstanceOf(RegExp);
    expect(DEFAULT_RULES.PARTNER_ROLE_RE).toBeInstanceOf(RegExp);
    expect(DEFAULT_RULES.ADVISOR_ROLE_RE).toBeInstanceOf(RegExp);
    expect(DEFAULT_RULES.EMPLOYEE_ROLE_RE).toBeInstanceOf(RegExp);
  });

  it("ships a flat frontmatter map (duplicate fields allowed)", () => {
    expect(Array.isArray(FRONTMATTER_LINK_MAP)).toBe(true);
    const fields = FRONTMATTER_LINK_MAP.map((e) => e.field);
    expect(fields).toContain("company");
    expect(fields).toContain("investors");
  });
});

// ─── Input validation ───────────────────────────────────────────────────────

describe("input validation (zod)", () => {
  it("rejects an empty pageId", async () => {
    await expect(
      extractLinks({ ...base, pageId: "", body: "", frontmatter: {} }),
    ).rejects.toThrow();
  });

  it("rejects a non-string body", async () => {
    await expect(
      // @ts-expect-error — deliberately invalid input at the boundary
      extractLinks({ ...base, body: 123, frontmatter: {} }),
    ).rejects.toThrow();
  });
});

// ─── Code stripping ─────────────────────────────────────────────────────────

describe("code stripping", () => {
  it("ignores entities inside fenced code blocks", async () => {
    const resolver = new FakeResolver({ "companies/acme": "p:acme" });
    const r = await extractLinks({
      ...base,
      resolver,
      body: "```\nsee [[companies/acme]] here\n```\nplain text",
    });
    expect(r.edges).toHaveLength(0);
    expect(resolver.calls).toHaveLength(0);
  });

  it("ignores entities inside inline code spans", async () => {
    const resolver = new FakeResolver({ "companies/acme": "p:acme" });
    const r = await extractLinks({
      ...base,
      resolver,
      body: "config key `[[companies/acme]]` is literal",
    });
    expect(r.edges).toHaveLength(0);
  });

  it("still extracts entities outside code", async () => {
    const resolver = new FakeResolver({ "companies/acme": "p:acme" });
    const r = await extractLinks({
      ...base,
      resolver,
      body: "`noop` then [[companies/acme]] outside",
    });
    expect(r.edges).toHaveLength(1);
    expect(r.edges[0]?.toPageId).toBe("p:acme");
  });
});

// ─── Reference passes ───────────────────────────────────────────────────────

describe("reference passes", () => {
  it("a: source-qualified wikilink → qualified resolutionType", async () => {
    const resolver = new FakeResolver({ "companies/acme": "p:acme" }, "unqualified");
    const r = await extractLinks({
      ...base,
      resolver,
      body: "met [[other-src:companies/acme]] last week",
    });
    expect(r.edges).toHaveLength(1);
    expect(r.edges[0]?.resolutionType).toBe("qualified");
  });

  it("b: wikilink with display alias → unqualified", async () => {
    const resolver = new FakeResolver({ "companies/acme": "p:acme" });
    const r = await extractLinks({
      ...base,
      resolver,
      body: "see [[companies/acme|Acme Corp]] now",
    });
    expect(r.edges).toHaveLength(1);
    expect(r.edges[0]?.resolutionType).toBe("unqualified");
    expect(r.edges[0]?.linkSource).toBe("markdown");
  });

  it("c: markdown link → unqualified", async () => {
    const resolver = new FakeResolver({ "companies/acme": "p:acme" });
    const r = await extractLinks({
      ...base,
      resolver,
      body: "visit [Acme](companies/acme) today",
    });
    expect(r.edges).toHaveLength(1);
    expect(r.edges[0]?.toPageId).toBe("p:acme");
  });

  it("d: bare slug → unqualified", async () => {
    const resolver = new FakeResolver({ "companies/acme": "p:acme" });
    const r = await extractLinks({
      ...base,
      resolver,
      body: "the firm companies/acme is notable",
    });
    expect(r.edges).toHaveLength(1);
    expect(r.edges[0]?.toPageId).toBe("p:acme");
  });

  it("span masking: qualified beats unqualified on the same span", async () => {
    const resolver = new FakeResolver({ "companies/acme": "p:acme" });
    const r = await extractLinks({
      ...base,
      resolver,
      body: "[[src:companies/acme]] then a bare companies/acme later",
    });
    // One qualified (the [[src:...]]) + one bare slug elsewhere = 2 distinct.
    // The qualified span must NOT also be re-emitted by the bare-slug pass.
    const qualified = r.edges.filter((e) => e.resolutionType === "qualified");
    expect(qualified).toHaveLength(1);
  });

  it("span masking: a wikilink is not double-counted as a bare slug", async () => {
    const resolver = new FakeResolver({ "companies/acme": "p:acme" });
    const r = await extractLinks({
      ...base,
      resolver,
      body: "only [[companies/acme]] here",
    });
    expect(r.edges).toHaveLength(1);
  });
});

// ─── Dir whitelist gate ─────────────────────────────────────────────────────

describe("dir whitelist gate", () => {
  it("drops references whose dir is not in the pattern", async () => {
    const resolver = new FakeResolver({ "secrets/key": "p:key" });
    const r = await extractLinks({
      ...base,
      resolver,
      body: "see [[secrets/key]] nope",
    });
    expect(r.edges).toHaveLength(0);
    expect(resolver.calls).toHaveLength(0);
  });

  it("honours a custom dirPattern", async () => {
    const resolver = new FakeResolver({ "widgets/x": "p:x" });
    const r = await extractLinks({
      ...base,
      resolver,
      body: "see [[widgets/x]] yes",
      dirPattern: /^widgets$/,
    });
    expect(r.edges).toHaveLength(1);
  });
});

// ─── Verb-type inference + precedence ───────────────────────────────────────

describe("verb-type inference", () => {
  const resolver = () => new FakeResolver({ "companies/acme": "p:acme" });

  it("infers founded", async () => {
    const r = await extractLinks({
      ...base,
      resolver: resolver(),
      body: "Alice founded [[companies/acme]] in 2019",
    });
    expect(r.edges[0]?.linkType).toBe("founded");
  });

  it("infers invested_in", async () => {
    const r = await extractLinks({
      ...base,
      resolver: resolver(),
      body: "We invested in [[companies/acme]] last round",
    });
    expect(r.edges[0]?.linkType).toBe("invested_in");
  });

  it("infers advises", async () => {
    const r = await extractLinks({
      ...base,
      resolver: resolver(),
      body: "She advises [[companies/acme]] on strategy",
    });
    expect(r.edges[0]?.linkType).toBe("advises");
  });

  it("infers works_at", async () => {
    const r = await extractLinks({
      ...base,
      resolver: resolver(),
      body: "He works at [[companies/acme]] now",
    });
    expect(r.edges[0]?.linkType).toBe("works_at");
  });

  it("falls back to mentions when no verb matches", async () => {
    const r = await extractLinks({
      ...base,
      resolver: resolver(),
      body: "Random note about [[companies/acme]] here",
    });
    expect(r.edges[0]?.linkType).toBe("mentions");
  });

  it("precedence: founded beats invested_in in the same window", async () => {
    const r = await extractLinks({
      ...base,
      resolver: resolver(),
      body: "She founded and later invested in [[companies/acme]] herself",
    });
    expect(r.edges[0]?.linkType).toBe("founded");
  });

  it("precedence: invested_in beats advises", async () => {
    const r = await extractLinks({
      ...base,
      resolver: resolver(),
      body: "He advises and also invested in [[companies/acme]] directly",
    });
    expect(r.edges[0]?.linkType).toBe("invested_in");
  });

  it("precedence: advises beats works_at", async () => {
    const r = await extractLinks({
      ...base,
      resolver: resolver(),
      body: "He works at the firm but mainly advises [[companies/acme]] now",
    });
    expect(r.edges[0]?.linkType).toBe("advises");
  });

  it("captures a context window on the edge", async () => {
    const r = await extractLinks({
      ...base,
      resolver: resolver(),
      body: "Alice founded [[companies/acme]] in 2019",
    });
    expect(typeof r.edges[0]?.context).toBe("string");
    expect(r.edges[0]?.context).toContain("founded");
  });

  it("honours overridden rules", async () => {
    const r = await extractLinks({
      ...base,
      resolver: resolver(),
      body: "Alice birthed [[companies/acme]] in 2019",
      rules: { FOUNDED_RE: /\bbirthed\b/i },
    });
    expect(r.edges[0]?.linkType).toBe("founded");
  });
});

// ─── Page-role prior fallback ───────────────────────────────────────────────

describe("page-role prior fallback", () => {
  const resolver = () => new FakeResolver({ "companies/acme": "p:acme" });

  it("investor role → invested_in when per-edge falls to mentions", async () => {
    const r = await extractLinks({
      ...base,
      resolver: resolver(),
      pageType: "person",
      body: "Alice is a General Partner at the fund. Portfolio: [[companies/acme]].",
    });
    expect(r.edges[0]?.linkType).toBe("invested_in");
  });

  it("advisor role → advises when per-edge falls to mentions", async () => {
    const r = await extractLinks({
      ...base,
      resolver: resolver(),
      body: "Alice is a technical advisor. Notable: [[companies/acme]].",
    });
    expect(r.edges[0]?.linkType).toBe("advises");
  });

  it("employee role → works_at when per-edge falls to mentions", async () => {
    const r = await extractLinks({
      ...base,
      resolver: resolver(),
      body: "Alice is a software engineer. Currently: [[companies/acme]].",
    });
    expect(r.edges[0]?.linkType).toBe("works_at");
  });

  it("role prior precedence: investor beats advisor beats employee", async () => {
    const r = await extractLinks({
      ...base,
      resolver: resolver(),
      body: "Alice, a General Partner who also advises and is an engineer. See [[companies/acme]].",
    });
    expect(r.edges[0]?.linkType).toBe("invested_in");
  });

  it("role prior does NOT apply to non people→companies edges", async () => {
    const resolver2 = new FakeResolver({ "media/post": "p:post" });
    const r = await extractLinks({
      ...base,
      resolver: resolver2,
      body: "Alice is a General Partner. Coverage: [[media/post]].",
    });
    expect(r.edges[0]?.linkType).toBe("mentions");
  });

  it("per-edge verb still wins over the role prior", async () => {
    const r = await extractLinks({
      ...base,
      resolver: resolver(),
      body: "Alice is a General Partner. She founded [[companies/acme]] herself.",
    });
    expect(r.edges[0]?.linkType).toBe("founded");
  });
});

// ─── Page-type shortcuts ────────────────────────────────────────────────────

describe("page-type shortcuts", () => {
  it("meeting page ⇒ attended", async () => {
    const resolver = new FakeResolver({ "people/bob": "p:bob" });
    const r = await extractLinks({
      ...base,
      resolver,
      pageType: "meeting",
      body: "Notes with [[people/bob]] discussing the deal",
    });
    expect(r.edges[0]?.linkType).toBe("attended");
  });

  it("image page ⇒ image_of", async () => {
    const resolver = new FakeResolver({ "people/bob": "p:bob" });
    const r = await extractLinks({
      ...base,
      resolver,
      pageType: "image",
      body: "Photo of [[people/bob]] at the event",
    });
    expect(r.edges[0]?.linkType).toBe("image_of");
  });

  it("media page ⇒ mentions", async () => {
    const resolver = new FakeResolver({ "companies/acme": "p:acme" });
    const r = await extractLinks({
      ...base,
      resolver,
      pageType: "media",
      body: "Article where Alice founded [[companies/acme]] — still mentions",
    });
    expect(r.edges[0]?.linkType).toBe("mentions");
  });
});

// ─── Frontmatter → edges ────────────────────────────────────────────────────

describe("frontmatter edges", () => {
  it("company → works_at outgoing (current page is subject)", async () => {
    const resolver = new FakeResolver({ "companies/acme": "p:acme" });
    const r = await extractLinks({
      ...base,
      resolver,
      body: "",
      frontmatter: { company: "companies/acme" },
    });
    const e = r.edges.find((x) => x.linkSource === "frontmatter");
    expect(e?.linkType).toBe("works_at");
    expect(e?.fromPageId).toBe("people/alice");
    expect(e?.toPageId).toBe("p:acme");
    expect(e?.originField).toBe("company");
    expect(e?.originPageId).toBe("people/alice");
  });

  it("key_people → works_at incoming (value is subject, edge reversed)", async () => {
    const resolver = new FakeResolver({ "people/bob": "p:bob" });
    const r = await extractLinks({
      ...base,
      resolver,
      body: "",
      frontmatter: { key_people: ["people/bob"] },
    });
    const e = r.edges.find((x) => x.linkSource === "frontmatter");
    expect(e?.linkType).toBe("works_at");
    expect(e?.fromPageId).toBe("p:bob");
    expect(e?.toPageId).toBe("people/alice");
  });

  it("investors → invested_in incoming with dirHint passthrough", async () => {
    const resolver = new FakeResolver({ "funds/vc": "p:vc" });
    const r = await extractLinks({
      ...base,
      resolver,
      body: "",
      frontmatter: { investors: ["funds/vc"] },
    });
    const e = r.edges.find((x) => x.linkSource === "frontmatter");
    expect(e?.linkType).toBe("invested_in");
    expect(e?.fromPageId).toBe("p:vc");
    expect(e?.toPageId).toBe("people/alice");
    const call = resolver.calls.find((c) => c.name === "funds/vc");
    expect(call?.dirHint).toEqual(["companies", "funds", "people"]);
  });

  it("attendees → attended incoming", async () => {
    const resolver = new FakeResolver({ "people/bob": "p:bob" });
    const r = await extractLinks({
      ...base,
      resolver,
      body: "",
      frontmatter: { attendees: ["people/bob"] },
    });
    const e = r.edges.find((x) => x.linkSource === "frontmatter");
    expect(e?.linkType).toBe("attended");
    expect(e?.fromPageId).toBe("p:bob");
  });

  it("founders → founded incoming", async () => {
    const resolver = new FakeResolver({ "people/bob": "p:bob" });
    const r = await extractLinks({
      ...base,
      resolver,
      body: "",
      frontmatter: { founders: ["people/bob"] },
    });
    const e = r.edges.find((x) => x.linkSource === "frontmatter");
    expect(e?.linkType).toBe("founded");
    expect(e?.fromPageId).toBe("p:bob");
  });

  it("advisors → advises incoming", async () => {
    const resolver = new FakeResolver({ "people/bob": "p:bob" });
    const r = await extractLinks({
      ...base,
      resolver,
      body: "",
      frontmatter: { advisors: ["people/bob"] },
    });
    const e = r.edges.find((x) => x.linkSource === "frontmatter");
    expect(e?.linkType).toBe("advises");
    expect(e?.fromPageId).toBe("p:bob");
  });

  it("duplicate field name with different pageType filters coexist", async () => {
    // Synthesise a map where `tag` means two things depending on pageType.
    const map = [
      ...FRONTMATTER_LINK_MAP,
      {
        field: "tag",
        linkType: "mentions" as const,
        direction: "outgoing" as const,
        pageType: "note",
      },
      {
        field: "tag",
        linkType: "attended" as const,
        direction: "outgoing" as const,
        pageType: "meeting",
      },
    ];
    const resolver = new FakeResolver({ "companies/acme": "p:acme" });
    const r = await extractLinks({
      ...base,
      resolver,
      body: "",
      pageType: "meeting",
      frontmatter: { tag: "companies/acme" },
      rules: { FRONTMATTER_LINK_MAP: map },
    });
    const e = r.edges.find((x) => x.originField === "tag");
    expect(e?.linkType).toBe("attended");
  });
});

// ─── Resolution policy ──────────────────────────────────────────────────────

describe("resolution policy", () => {
  it("surfaces unresolved names instead of emitting dead edges", async () => {
    const resolver = new FakeResolver({});
    const r = await extractLinks({
      ...base,
      resolver,
      body: "see [[companies/ghost]] nowhere",
    });
    expect(r.edges).toHaveLength(0);
    expect(r.unresolved).toContain("companies/ghost");
  });

  it("dedupes unresolved names in stable order", async () => {
    const resolver = new FakeResolver({});
    const r = await extractLinks({
      ...base,
      resolver,
      body: "[[companies/ghost]] and [[companies/ghost]] and [[people/none]]",
    });
    expect(r.unresolved).toEqual(["companies/ghost", "people/none"]);
  });

  it("qualified pass overrides resolver resolutionType to qualified", async () => {
    const resolver = new FakeResolver({ "companies/acme": "p:acme" }, "unqualified");
    const r = await extractLinks({
      ...base,
      resolver,
      body: "via [[src:companies/acme]] here",
    });
    expect(r.edges[0]?.resolutionType).toBe("qualified");
  });

  it("non-qualified pass keeps the resolver's resolutionType", async () => {
    const resolver = new FakeResolver({ "companies/acme": "p:acme" }, "unqualified");
    const r = await extractLinks({
      ...base,
      resolver,
      body: "via [[companies/acme]] here",
    });
    expect(r.edges[0]?.resolutionType).toBe("unqualified");
  });

  it("passes batch mode through to the resolver", async () => {
    const resolver = new FakeResolver({ "companies/acme": "p:acme" });
    await extractLinks({
      ...base,
      resolver,
      mode: "batch",
      body: "see [[companies/acme]]",
    });
    expect(resolver.calls.every((c) => c.mode === "batch")).toBe(true);
  });

  it("passes live mode through to the resolver", async () => {
    const resolver = new FakeResolver({ "companies/acme": "p:acme" });
    await extractLinks({
      ...base,
      resolver,
      mode: "live",
      body: "see [[companies/acme]]",
    });
    expect(resolver.calls.every((c) => c.mode === "live")).toBe(true);
  });
});

// ─── Immutability ───────────────────────────────────────────────────────────

describe("immutability", () => {
  it("never mutates the frontmatter input", async () => {
    const resolver = new FakeResolver({ "companies/acme": "p:acme" });
    const frontmatter = Object.freeze({ company: "companies/acme" });
    const r = await extractLinks({
      ...base,
      resolver,
      body: "",
      frontmatter,
    });
    expect(r.edges.length).toBeGreaterThan(0);
    expect(frontmatter).toEqual({ company: "companies/acme" });
  });

  it("never mutates the default rule bundle", async () => {
    const before = DEFAULT_RULES.FOUNDED_RE.source;
    const resolver = new FakeResolver({ "companies/acme": "p:acme" });
    await extractLinks({
      ...base,
      resolver,
      body: "Alice founded [[companies/acme]] here",
      rules: { FOUNDED_RE: /\bzzz\b/i },
    });
    expect(DEFAULT_RULES.FOUNDED_RE.source).toBe(before);
  });
});
