import { describe, expect, it } from "vitest";
import {
  GITIGNORE_CORPUS_VERSION,
  GITIGNORE_TEMPLATES,
  type GitignoreMergeResult,
  type GitignoreTemplate,
  gitignoreGeneratorTool,
  gitignoreStacksTool,
  mergeGitignore,
  resolveGitignoreStack,
  w3GitignoreGeneratorTools,
} from "./w3-gitignore-generator";

// The registry erases tool output types (AnyForgeToolDefinition), so the test
// re-attaches the contract it is asserting against.
function run(input: unknown): GitignoreMergeResult {
  return gitignoreGeneratorTool.execute(
    gitignoreGeneratorTool.inputSchema.parse(input),
  ) as GitignoreMergeResult;
}

interface StacksResult {
  stacks: Array<Pick<GitignoreTemplate, "id" | "name" | "scope" | "kind"> & { patterns: number }>;
  matched: number;
  total: number;
  corpusVersion: string;
}

function runStacks(input: unknown): StacksResult {
  return gitignoreStacksTool.execute(gitignoreStacksTool.inputSchema.parse(input)) as StacksResult;
}

/* ── registry contract ──────────────────────────────────────────────────── */

describe("tool declarations", () => {
  it("declares both tools pure with slug-derived meter ids", () => {
    expect(w3GitignoreGeneratorTools).toHaveLength(2);
    for (const tool of w3GitignoreGeneratorTools) {
      expect(tool.sideEffect).toBe("pure");
      expect(tool.category).toBe("template");
      expect(tool.meterId).toBe(`forge.template.${tool.slug.replace(/-/g, "_")}`);
      expect(tool.title.zh).toBeTruthy();
      expect(tool.title.en).toBeTruthy();
      expect(tool.seoKeywords.zh).toBeTruthy();
      expect(tool.seoKeywords.en).toBeTruthy();
      expect(tool.engine.upstream).toContain("github/gitignore");
      expect(tool.engine.version).toBe(GITIGNORE_CORPUS_VERSION);
    }
    expect(gitignoreGeneratorTool.meterId).toBe("forge.template.gitignore_generator");
    expect(gitignoreGeneratorTool.roots).toContain("template");
  });

  it("is deterministic — the same request twice gives byte-identical output", () => {
    const a = run({ stacks: ["node", "macos"] });
    const b = run({ stacks: ["node", "macos"] });
    expect(a.content).toBe(b.content);
  });
});

/* ── corpus integrity (know-how 3: content is data, so guard the data) ──── */

describe("corpus", () => {
  it("has unique ids and no key collisions across ids, names and aliases", () => {
    const ids = GITIGNORE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);

    const seen = new Map<string, string>();
    for (const template of GITIGNORE_TEMPLATES) {
      for (const key of [template.id, template.name, ...template.aliases]) {
        const norm = key.toLowerCase().replace(/[^a-z0-9+#]/g, "");
        const owner = seen.get(norm);
        expect(owner ?? template.id).toBe(template.id);
        seen.set(norm, template.id);
      }
    }
  });

  it("carries no empty templates and no blank patterns", () => {
    for (const template of GITIGNORE_TEMPLATES) {
      expect(template.patterns.length).toBeGreaterThan(0);
      for (const pattern of template.patterns) {
        expect(pattern.trim()).toBe(pattern);
        expect(pattern.length).toBeGreaterThan(0);
      }
    }
  });

  it("classifies OS and editor templates as global scope (know-how 4)", () => {
    for (const template of GITIGNORE_TEMPLATES) {
      if (template.kind === "os" || template.kind === "editor") {
        expect(template.scope).toBe("global");
      } else {
        expect(template.scope).toBe("project");
      }
    }
  });
});

/* ── know-how 1: the unit is a stack, and aliases resolve ───────────────── */

describe("stack resolution", () => {
  it("resolves ids, display names and aliases case/separator-insensitively", () => {
    expect(resolveGitignoreStack("node")?.id).toBe("node");
    expect(resolveGitignoreStack("NODE")?.id).toBe("node");
    expect(resolveGitignoreStack("Node.js")?.id).toBe("node");
    expect(resolveGitignoreStack("VS Code")?.id).toBe("visualstudiocode");
    expect(resolveGitignoreStack("vs-code")?.id).toBe("visualstudiocode");
    expect(resolveGitignoreStack("golang")?.id).toBe("go");
    expect(resolveGitignoreStack("C#")?.id).toBe("csharp");
    expect(resolveGitignoreStack("IntelliJ")?.id).toBe("jetbrains");
    expect(resolveGitignoreStack("OS X")?.id).toBe("macos");
  });

  it("returns null for a stack that is not in the corpus", () => {
    expect(resolveGitignoreStack("cobol")).toBeNull();
    expect(resolveGitignoreStack("")).toBeNull();
  });

  it("composes three axes — language, OS and editor — in one file (know-how 1 + 6)", () => {
    const out = run({ stacks: ["node", "macos", "visualstudiocode"] });
    expect(out.stacksResolved).toEqual(["macos", "node", "visualstudiocode"]);
    expect(out.content).toContain("### Node ###");
    expect(out.content).toContain("### macOS ###");
    expect(out.content).toContain("### VisualStudioCode ###");
    expect(out.content).toContain("node_modules/");
    expect(out.content).toContain(".DS_Store");
    expect(out.content).toContain("!.vscode/settings.json");
  });
});

/* ── know-how 2: sectioned merge, alphabetized, de-duplicated ───────────── */

describe("merge", () => {
  it("orders sections alphabetically regardless of request order", () => {
    const a = run({ stacks: ["python", "go", "macos"] });
    const b = run({ stacks: ["macos", "python", "go"] });
    expect(a.content).toBe(b.content);
    expect(a.stacksResolved).toEqual(["go", "macos", "python"]);
    const order = ["### Go ###", "### macOS ###", "### Python ###"].map((h) =>
      a.content.indexOf(h),
    );
    expect(order[0]).toBeGreaterThan(-1);
    expect(order[0]).toBeLessThan(order[1] as number);
    expect(order[1]).toBeLessThan(order[2] as number);
  });

  it("de-duplicates a pattern shared by two ecosystems, keeping the first section's copy", () => {
    // Node and Python both list `build/` and `dist/`. Node sorts first, so the
    // Python section loses exactly those two lines: 2 duplicates removed.
    const out = run({ stacks: ["node", "python"] });
    expect(out.duplicatesRemoved).toBe(2);
    const occurrences = out.content.split("\n").filter((line) => line === "dist/").length;
    expect(occurrences).toBe(1);
    const nodeAt = out.content.indexOf("### Node ###");
    const pythonAt = out.content.indexOf("### Python ###");
    const distAt = out.content.indexOf("\ndist/");
    expect(distAt).toBeGreaterThan(nodeAt);
    expect(distAt).toBeLessThan(pythonAt);
  });

  it("keeps every duplicate when dedupe is off", () => {
    const out = run({ stacks: ["node", "python"], dedupe: false });
    expect(out.duplicatesRemoved).toBe(0);
    expect(out.content.split("\n").filter((line) => line === "dist/").length).toBe(2);
  });

  it("never dedupes a negation out of a template — git honours the LAST match", () => {
    // A re-include (`!.vscode/settings.json`) only holds while it is the last
    // pattern matching that path. Deleting the copy in a later section as a
    // "duplicate" hands the decision back to whatever ignore rule sits between
    // the two, which silently re-ignores the file.
    const all = GITIGNORE_TEMPLATES.map((t) => t.id);
    const expected = GITIGNORE_TEMPLATES.flatMap((t) => t.patterns).filter((p) =>
      p.startsWith("!"),
    );
    expect(expected.length).toBeGreaterThan(0);
    const merged = mergeGitignore(all, { dedupe: true });
    const emitted = merged.content.split("\n").filter((line) => line.startsWith("!"));
    // Every negation the corpus declares appears in the merged file, once per
    // declaring section — dedupe may never take one away.
    expect(emitted.sort()).toEqual([...expected].sort());
  });

  it("never dedupes comment lines out of a template", () => {
    // Rust ships a guidance comment about Cargo.lock; it must survive a merge
    // where dedupe is on and another section runs first.
    const out = run({ stacks: ["rust", "node"] });
    expect(out.content).toContain("# Cargo.lock");
  });

  it("keeps a heavily absorbed section, its banner and its remaining unique line", () => {
    // "composer" < "php", so Composer's section runs first and PHP loses its
    // `vendor/` line: 1 duplicate removed, PHP keeps its other 4, both banners
    // survive so neither stack looks silently ignored.
    const out = run({ stacks: ["php", "composer"] });
    expect(out.duplicatesRemoved).toBe(1);
    expect(out.content).toContain("### Composer ###");
    expect(out.content).toContain("### PHP ###");
    expect(out.content).toContain("composer.phar");
    expect(out.content.split("\n").filter((line) => line === "vendor/").length).toBe(1);
    expect(out.sections.find((s) => s.id === "php")?.patterns).toBe(4);
  });

  it("collapses a stack requested twice under different spellings", () => {
    const out = run({ stacks: ["node", "nodejs", "NPM"] });
    expect(out.stacksResolved).toEqual(["node"]);
    expect(out.content.split("### Node ###").length - 1).toBe(1);
  });
});

/* ── know-how 4 + 5: scope reporting and the untracked-files caveat ─────── */

describe("guidance", () => {
  it("reports which selected stacks belong in a personal global gitignore", () => {
    const out = run({ stacks: ["node", "macos", "jetbrains"] });
    expect(out.globalScoped).toEqual(["jetbrains", "macos"]);
    expect(out.sections.find((s) => s.id === "node")?.scope).toBe("project");
  });

  it("states the already-tracked-files caveat in the file and in the payload", () => {
    const out = run({ stacks: ["node"] });
    expect(out.note).toContain("git rm -r --cached");
    expect(out.content).toContain("git rm -r --cached");
  });

  it("emits a traceable header and closing banner naming the exact stacks", () => {
    const out = run({ stacks: ["node", "macos"] });
    expect(out.content).toContain("# .gitignore generated by forge.nebutra.com");
    expect(out.content).toContain("# Stacks: macos, node");
    expect(out.content).toContain(`curated subset ${GITIGNORE_CORPUS_VERSION}`);
    expect(out.content.trimEnd().endsWith("# End of .gitignore for macos, node")).toBe(true);
  });

  it("drops every banner comment when header is false", () => {
    const out = run({ stacks: ["node"], header: false });
    expect(out.content.startsWith("### Node ###")).toBe(true);
    expect(out.content).not.toContain("forge.nebutra.com");
    expect(out.content.endsWith("\n")).toBe(true);
  });

  it("counts lines and bytes of the file it actually returned", () => {
    const out = run({ stacks: ["linux"] });
    expect(out.lines).toBe(out.content.split("\n").length - 1);
    expect(out.bytes).toBe(Buffer.byteLength(out.content, "utf8"));
  });
});

/* ── unknown ids: reported, never silently dropped ──────────────────────── */

describe("unknown stacks", () => {
  it("reports an unmatched id in notFound while still generating the rest", () => {
    const out = run({ stacks: ["node", "cobol"] });
    expect(out.notFound).toEqual(["cobol"]);
    expect(out.stacksResolved).toEqual(["node"]);
    expect(out.content).toContain("### Node ###");
  });

  it("fails with a stable unknown_stack code in strict mode", () => {
    expect(() => run({ stacks: ["node", "cobol"], strict: true })).toThrowError(/unknown_stack/);
    try {
      run({ stacks: ["node", "cobol"], strict: true });
    } catch (err) {
      expect((err as { code?: string }).code).toBe("invalid_input");
      expect((err as Error).message).toContain("cobol");
    }
  });

  it("fails when nothing at all resolved, even in non-strict mode", () => {
    expect(() => run({ stacks: ["cobol", "fortran"] })).toThrowError(/unknown_stack/);
  });
});

/* ── schema rejects bad input ───────────────────────────────────────────── */

describe("input schema", () => {
  it("rejects an empty stack list", () => {
    expect(gitignoreGeneratorTool.inputSchema.safeParse({ stacks: [] }).success).toBe(false);
  });

  it("rejects a missing stacks field, non-array stacks and non-string entries", () => {
    expect(gitignoreGeneratorTool.inputSchema.safeParse({}).success).toBe(false);
    expect(gitignoreGeneratorTool.inputSchema.safeParse({ stacks: "node" }).success).toBe(false);
    expect(gitignoreGeneratorTool.inputSchema.safeParse({ stacks: [1] }).success).toBe(false);
    expect(gitignoreGeneratorTool.inputSchema.safeParse({ stacks: [""] }).success).toBe(false);
  });

  it("rejects an unbounded request", () => {
    const many = Array.from({ length: 41 }, () => "node");
    expect(gitignoreGeneratorTool.inputSchema.safeParse({ stacks: many }).success).toBe(false);
  });

  it("defaults dedupe/header on and strict off", () => {
    const parsed = gitignoreGeneratorTool.inputSchema.parse({ stacks: ["node"] });
    expect(parsed).toMatchObject({ dedupe: true, header: true, strict: false });
  });
});

/* ── stack list tool ────────────────────────────────────────────────────── */

describe("gitignore-stacks", () => {
  it("lists the whole corpus by default", () => {
    const out = runStacks({});
    expect(out.total).toBe(GITIGNORE_TEMPLATES.length);
    expect(out.matched).toBe(GITIGNORE_TEMPLATES.length);
    expect(out.stacks[0]).toMatchObject({ id: expect.any(String), scope: expect.any(String) });
  });

  it("matches on alias as well as id", () => {
    const out = runStacks({ query: "vscode" });
    expect(out.stacks.map((s) => s.id)).toContain("visualstudiocode");
  });

  it("filters by scope and by kind", () => {
    const global = runStacks({ scope: "global" });
    expect(global.stacks.every((s) => s.scope === "global")).toBe(true);
    const editors = runStacks({ kind: "editor" });
    expect(editors.stacks.every((s) => s.kind === "editor")).toBe(true);
    expect(editors.matched).toBeGreaterThan(0);
  });

  it("returns an empty list rather than throwing on a no-match query", () => {
    const out = runStacks({ query: "cobol" });
    expect(out.stacks).toEqual([]);
    expect(out.matched).toBe(0);
  });

  it("honours limit and rejects a limit outside its bounds", () => {
    expect(runStacks({ limit: 3 }).stacks).toHaveLength(3);
    expect(gitignoreStacksTool.inputSchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(gitignoreStacksTool.inputSchema.safeParse({ scope: "planet" }).success).toBe(false);
  });
});

/* ── direct engine surface ──────────────────────────────────────────────── */

describe("mergeGitignore", () => {
  it("is callable without the tool wrapper and honours options", () => {
    const out = mergeGitignore(["macos"], { header: false });
    expect(out.content).toBe(
      [
        "### macOS ###",
        ...(GITIGNORE_TEMPLATES.find((t) => t.id === "macos")?.patterns ?? []),
      ].join("\n") + "\n",
    );
  });
});
