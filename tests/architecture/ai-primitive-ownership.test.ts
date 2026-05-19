import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const AI_ROOT = join(ROOT, "packages", "ai");
const PRIMITIVES_DIR = join(AI_ROOT, "ai-primitives");

type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  nebutra?: { surface?: string; featureId?: string };
};

const read = (path: string): string => readFileSync(join(ROOT, path), "utf8");
const readJson = (path: string): PackageJson => JSON.parse(read(path)) as PackageJson;

describe("AI primitive ownership", () => {
  it("has one zero-dependency support-contract owner", () => {
    expect(existsSync(join(PRIMITIVES_DIR, "package.json"))).toBe(true);
    const manifest = readJson("packages/ai/ai-primitives/package.json");

    expect(manifest.name).toBe("@nebutra/ai-primitives");
    expect(manifest.nebutra?.surface).toBe("support-contract");
    expect(manifest.nebutra?.featureId).toBe("ai-primitives");
    expect(manifest.dependencies ?? {}).toEqual({});
  });

  it("rewires all primitive consumers to the owner", () => {
    for (const packageDir of ["code-index", "knowledge-graph", "knowledge-rag", "agent-runtime"]) {
      const manifest = readJson(`packages/ai/${packageDir}/package.json`);
      expect(manifest.dependencies?.["@nebutra/ai-primitives"]).toBe("workspace:*");
    }
  });

  it("does not leave local hash, numeric, or token-estimate duplicates in consumers", () => {
    const forbidden = [
      {
        file: "packages/ai/code-index/src/interfaces.ts",
        patterns: [/from "node:crypto"/, /function\s+sha256\s*\(/],
      },
      {
        file: "packages/ai/knowledge-graph/src/interfaces.ts",
        patterns: [
          /from "node:crypto"/,
          /function\s+sha256\s*\(/,
          /function\s+cosineSimilarity\s*\(/,
        ],
      },
      {
        file: "packages/ai/knowledge-graph/src/hybrid-fusion.ts",
        patterns: [/function\s+clamp\s*\(/],
      },
      {
        file: "packages/ai/knowledge-graph/src/temporal-facts.ts",
        patterns: [/function\s+clamp\s*\(/],
      },
      {
        file: "packages/ai/knowledge-rag/src/scoring.ts",
        patterns: [/function\s+clamp\s*\(/],
      },
      {
        file: "packages/ai/agent-runtime/src/skills.ts",
        patterns: [/const\s+estimateTokens\s*=/],
      },
    ];

    for (const { file, patterns } of forbidden) {
      const source = read(file);
      for (const pattern of patterns) {
        expect(source, `${file} still matches ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("locks the non-merge boundaries that look similar but are different primitives", () => {
    const audit = read("docs/architecture/2026-05-19-ai-package-primitive-audit.md");
    expect(audit).toContain("code-index ≠ knowledge-graph");
    expect(audit).toContain("RRF 秩融合 ≠ weighted score blending");
    expect(audit).toContain("三套 chunker");

    const ragScoring = read("packages/ai/knowledge-rag/src/scoring.ts");
    expect(ragScoring).toContain("KnowledgeRagError");
    expect(ragScoring).toContain("E_DIM_MISMATCH");

    const codeIndex = read("packages/ai/code-index/src/interfaces.ts");
    const knowledgeGraph = read("packages/ai/knowledge-graph/src/interfaces.ts");
    expect(codeIndex).toContain('readonly __brand: "CollectionKey"');
    expect(knowledgeGraph).toContain('readonly __brand: "SourceScope"');
  });
});
