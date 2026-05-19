import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const AI_ROOT = join(ROOT, "packages", "ai");
const CAPABILITY_KIT_DIR = join(ROOT, "packages", "platform", "capability-kit");

type PackageStatus = "stable" | "foundation" | "wip" | "deprecated";

const ALLOWED_SURFACES = [
  "agent-runtime",
  "creative-surface",
  "ecosystem-product",
  "execution-capability",
  "execution-router",
  "gateway-experiment",
  "generation-capability",
  "legacy-experiment",
  "knowledge-product",
  "media-graph",
  "model-runtime",
  "persistence",
  "play-product",
  "product-orchestration",
  "provider-metadata",
  "semantic-index",
  "support-contract",
  "tool-protocol",
  "tool-registry",
] as const;

const PUBLIC_DISCLOSURE_SAFETY_CONSUMERS = [
  "@nebutra/idea-plaza",
  "@nebutra/founder-cemetery",
] as const;

const CAPABILITY_TENANT_FALLBACK_CONSUMERS = [
  "@nebutra/browser-control",
  "@nebutra/code-execution",
  "@nebutra/document-pipeline",
  "@nebutra/brand-genesis",
  "@nebutra/landing-builder",
  "@nebutra/outreach-engine",
  "@nebutra/support-deflector",
  "@nebutra/knowledge-base",
  "@nebutra/time-machine",
  "@nebutra/idea-plaza",
  "@nebutra/founder-cemetery",
  "@nebutra/cofounder-match",
  "@nebutra/play-marketplace",
] as const;

interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  nebutra?: {
    featureId?: string;
    status?: PackageStatus;
    productionReady?: boolean;
    gaps?: string[];
    surface?: string;
  };
}

const EXECUTION_CAPABILITY_PACKAGES = [
  "@nebutra/browser-control",
  "@nebutra/code-execution",
  "@nebutra/document-pipeline",
] as const;

const EXECUTION_CAPABILITY_FORBIDDEN_IMPORTS = [
  "@nebutra/agent-runtime",
  "@nebutra/agents",
  "ai",
  "@nebutra/llm-gateway",
  "@nebutra/provider-registry",
] as const;

const AGENT_RUNTIME_FORBIDDEN_IMPORTS = [
  "@nebutra/browser-control",
  "@nebutra/code-execution",
  "@nebutra/document-pipeline",
  "@nebutra/image-pipeline",
  "@nebutra/video-pipeline",
  "@nebutra/audio-pipeline",
  "@nebutra/voice-realtime",
  "@nebutra/3d-pipeline",
] as const;

const GENERATION_CAPABILITY_PACKAGES = [
  "@nebutra/image-pipeline",
  "@nebutra/video-pipeline",
  "@nebutra/audio-pipeline",
  "@nebutra/voice-realtime",
  "@nebutra/3d-pipeline",
] as const;

const CAPABILITY_DX_PACKAGES = [
  ...EXECUTION_CAPABILITY_PACKAGES,
  ...GENERATION_CAPABILITY_PACKAGES,
] as const;

const GENERATION_CAPABILITY_FORBIDDEN_IMPORTS = [
  "@nebutra/agent-runtime",
  "@nebutra/agents",
  "ai",
  "@nebutra/llm-gateway",
  "@nebutra/provider-registry",
] as const;

const PLAY_PRODUCT_FORBIDDEN_IMPORTS = [
  "@nebutra/agent-runtime",
  "@nebutra/agents",
  "ai",
  "@nebutra/llm-gateway",
  "@nebutra/provider-registry",
] as const;

const ECOSYSTEM_PRODUCT_PACKAGES = [
  "@nebutra/time-machine",
  "@nebutra/idea-plaza",
  "@nebutra/founder-cemetery",
  "@nebutra/cofounder-match",
  "@nebutra/play-marketplace",
] as const;

const ECOSYSTEM_PRODUCT_FORBIDDEN_IMPORTS = [
  "@nebutra/agent-runtime",
  "@nebutra/agents",
  "ai",
  "@nebutra/llm-gateway",
  "@nebutra/provider-registry",
] as const;

function readPackageJson(packageDir: string): PackageJson {
  return JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8")) as PackageJson;
}

function discoverAiPackages(): Array<{ dir: string; manifest: PackageJson }> {
  const trackedPackageJsonPaths = execFileSync(
    "git",
    ["ls-files", "--cached", "packages/ai/*/package.json"],
    { cwd: ROOT, encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter(Boolean);

  return trackedPackageJsonPaths
    .map((path) => join(ROOT, dirname(path)))
    .map((dir) => ({ dir, manifest: readPackageJson(dir) }))
    .filter(({ manifest }) => manifest.name?.startsWith("@nebutra/"));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function importPattern(packageName: string): RegExp {
  const escaped = escapeRegExp(packageName);
  return new RegExp(
    `(?:from\\s+["']${escaped}["']|import\\s+["']${escaped}["']|import\\(["']${escaped}["']\\))`,
  );
}

function collectProductionSourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];

  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectProductionSourceFiles(path));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    if (/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) continue;
    if (entry.name.endsWith(".d.ts")) continue;
    files.push(path);
  }

  return files;
}

function importViolations(
  packageDir: string,
  forbiddenImports: readonly string[],
): Array<{ file: string; imported: string }> {
  const sourceDir = join(packageDir, "src");
  const violations: Array<{ file: string; imported: string }> = [];

  for (const file of collectProductionSourceFiles(sourceDir)) {
    const source = readFileSync(file, "utf8");
    for (const forbiddenImport of forbiddenImports) {
      if (importPattern(forbiddenImport).test(source)) {
        violations.push({
          file: file.replace(`${ROOT}/`, ""),
          imported: forbiddenImport,
        });
      }
    }
  }

  return violations;
}

describe("AI package architecture governance", () => {
  const packages = discoverAiPackages();
  const byName = new Map(packages.map((entry) => [entry.manifest.name, entry]));

  it("has a package-wide AGENTS contract that names the canonical runtime and gateway boundaries", () => {
    const agentsPath = join(AI_ROOT, "AGENTS.md");
    expect(existsSync(agentsPath)).toBe(true);

    const contract = readFileSync(agentsPath, "utf8");
    expect(contract).toContain("@nebutra/agents");
    expect(contract).toContain("canonical model-execution runtime");
    expect(contract).toContain("@nebutra/ai-providers");
    expect(contract).toContain("metadata only");
    expect(contract).toContain("Execution capability tools");
    expect(contract).toContain("must not own Thread/Turn/Item");
    expect(contract).toContain("Generation capability tools");
    expect(contract).toContain("@nebutra/generation-context");
    expect(contract).toContain("@nebutra/execution-policy");
    expect(contract).toContain("@nebutra/local-embedding");
    expect(contract).toContain("@nebutra/capability-kit");
    expect(contract).toContain("@nebutra/capability-kit/debug");
    expect(contract).toContain("requireCapabilityTenant");
    expect(contract).toContain("@nebutra/tenant");
    expect(contract).toContain("runtime-local tenant admission");
    expect(contract).toContain("packages/ai/PACKAGE_MAP.md");
    expect(contract).toContain("Consolidation Rules");
    expect(contract).toContain("@nebutra/llm-gateway");
    expect(contract).toContain("not the production gateway");
  });

  it("requires every AI package to declare a unique featureId and governed surface", () => {
    const featureOwners = new Map<string, string>();
    const violations: string[] = [];

    for (const { manifest } of packages) {
      if (!manifest.name) continue;
      const featureId = manifest.nebutra?.featureId;
      const surface = manifest.nebutra?.surface;
      if (!featureId) {
        violations.push(`${manifest.name}: missing nebutra.featureId`);
      } else if (featureOwners.has(featureId)) {
        violations.push(`${manifest.name}: duplicate featureId ${featureId}`);
      } else {
        featureOwners.set(featureId, manifest.name);
      }

      if (!surface) {
        violations.push(`${manifest.name}: missing nebutra.surface`);
      } else if (!ALLOWED_SURFACES.includes(surface as (typeof ALLOWED_SURFACES)[number])) {
        violations.push(`${manifest.name}: invalid nebutra.surface ${surface}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps the human package map aligned with package manifests", () => {
    const packageMap = readFileSync(join(AI_ROOT, "PACKAGE_MAP.md"), "utf8");
    const missing = packages
      .map(({ manifest }) => manifest.name)
      .filter((name): name is string => Boolean(name))
      .filter((name) => !packageMap.includes(`\`${name}\``));

    for (const surface of ALLOWED_SURFACES) {
      expect(packageMap, `missing surface ${surface}`).toContain(`\`${surface}\``);
    }
    expect(missing).toEqual([]);
  });

  it("keeps AI SDK provider execution canonical in @nebutra/agents", () => {
    const agents = byName.get("@nebutra/agents")?.manifest;
    expect(agents?.dependencies?.ai ?? agents?.peerDependencies?.ai).toBeDefined();
    expect(agents?.dependencies?.["@ai-sdk/openai"]).toBeDefined();

    const aiProviders = byName.get("@nebutra/ai-providers")?.manifest;
    expect(aiProviders?.dependencies ?? {}).toEqual({});
  });

  it("marks legacy local provider experiments as non-production surfaces", () => {
    for (const packageName of ["@nebutra/llm-gateway", "@nebutra/provider-registry"]) {
      const manifest = byName.get(packageName)?.manifest;
      expect(manifest?.nebutra?.status, packageName).toBe("wip");
      expect(manifest?.nebutra?.productionReady, packageName).toBe(false);
      expect(manifest?.nebutra?.gaps?.length ?? 0, packageName).toBeGreaterThan(0);
    }
  });

  it("prevents new runtime packages from depending on the legacy local provider registry", () => {
    const violations: string[] = [];

    for (const { manifest } of packages) {
      if (!manifest.name || manifest.name === "@nebutra/llm-gateway") continue;
      const deps = { ...manifest.dependencies, ...manifest.devDependencies };
      if (deps["@nebutra/provider-registry"] === "workspace:*") {
        violations.push(`${manifest.name} -> @nebutra/provider-registry`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("classifies Layer 3 packages as execution capabilities with visible DX surfaces", () => {
    for (const packageName of EXECUTION_CAPABILITY_PACKAGES) {
      const entry = byName.get(packageName);
      expect(entry, packageName).toBeDefined();
      if (!entry) continue;

      expect(entry.manifest.nebutra?.status, packageName).toBe("wip");
      expect(entry.manifest.nebutra?.productionReady, packageName).toBe(false);
      expect(entry.manifest.nebutra?.surface, packageName).toBe("execution-capability");
      expect(entry.manifest.nebutra?.gaps?.length ?? 0, packageName).toBeGreaterThanOrEqual(3);
      expect(entry.manifest.scripts?.test, packageName).toBeDefined();
      expect(entry.manifest.scripts?.typecheck, packageName).toBeDefined();

      const examplesDir = join(entry.dir, "examples");
      const exampleCount = existsSync(examplesDir)
        ? readdirSync(examplesDir).filter((name) => name.endsWith(".ts")).length
        : 0;
      expect(exampleCount, packageName).toBeGreaterThanOrEqual(3);
      expect(existsSync(join(entry.dir, "README.md")), packageName).toBe(true);
    }
  });

  it("keeps execution capabilities out of runtime/model/provider ownership", () => {
    const violations: Array<{ packageName: string; file: string; imported: string }> = [];

    for (const packageName of EXECUTION_CAPABILITY_PACKAGES) {
      const entry = byName.get(packageName);
      if (!entry) continue;
      for (const violation of importViolations(entry.dir, EXECUTION_CAPABILITY_FORBIDDEN_IMPORTS)) {
        violations.push({ packageName, ...violation });
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps agent-runtime decoupled from concrete execution capability packages", () => {
    const entry = byName.get("@nebutra/agent-runtime");
    expect(entry).toBeDefined();
    if (!entry) return;

    expect(importViolations(entry.dir, AGENT_RUNTIME_FORBIDDEN_IMPORTS)).toEqual([]);
  });

  it("classifies Layer 4 packages as generation capabilities with shared BrandContext", () => {
    for (const packageName of GENERATION_CAPABILITY_PACKAGES) {
      const entry = byName.get(packageName);
      expect(entry, packageName).toBeDefined();
      if (!entry) continue;

      expect(entry.manifest.nebutra?.status, packageName).toBe("wip");
      expect(entry.manifest.nebutra?.productionReady, packageName).toBe(false);
      expect(entry.manifest.nebutra?.surface, packageName).toBe("generation-capability");
      expect(entry.manifest.dependencies?.["@nebutra/generation-context"], packageName).toBe(
        "workspace:*",
      );
      expect(entry.manifest.nebutra?.gaps?.length ?? 0, packageName).toBeGreaterThanOrEqual(3);

      const examplesDir = join(entry.dir, "examples");
      const exampleCount = existsSync(examplesDir)
        ? readdirSync(examplesDir).filter((name) => name.endsWith(".ts")).length
        : 0;
      expect(exampleCount, packageName).toBeGreaterThanOrEqual(3);
      expect(existsSync(join(entry.dir, "README.md")), packageName).toBe(true);
    }
  });

  it("keeps generation capabilities out of runtime/model/provider ownership", () => {
    const violations: Array<{ packageName: string; file: string; imported: string }> = [];

    for (const packageName of GENERATION_CAPABILITY_PACKAGES) {
      const entry = byName.get(packageName);
      if (!entry) continue;
      for (const violation of importViolations(
        entry.dir,
        GENERATION_CAPABILITY_FORBIDDEN_IMPORTS,
      )) {
        violations.push({ packageName, ...violation });
      }
    }

    expect(violations).toEqual([]);
  });

  it("centralizes capability DX debug JSONL storage in @nebutra/capability-kit", () => {
    const violations: string[] = [];

    for (const packageName of CAPABILITY_DX_PACKAGES) {
      const entry = byName.get(packageName);
      expect(entry, packageName).toBeDefined();
      if (!entry) continue;

      expect(entry.manifest.dependencies?.["@nebutra/capability-kit"], packageName).toBe(
        "workspace:*",
      );

      for (const file of collectProductionSourceFiles(join(entry.dir, "src"))) {
        const source = readFileSync(file, "utf8");
        if (/function\s+debugPath\b/.test(source)) {
          violations.push(`${file.replace(`${ROOT}/`, "")}: local debugPath`);
        }
        if (/function\s+appendDebug\b/.test(source)) {
          violations.push(`${file.replace(`${ROOT}/`, "")}: local appendDebug`);
        }
        if (/readFile\(\s*debugPath\(/.test(source)) {
          violations.push(`${file.replace(`${ROOT}/`, "")}: local debug reader`);
        }
      }

      const sourceText = collectProductionSourceFiles(join(entry.dir, "src"))
        .map((file) => readFileSync(file, "utf8"))
        .join("\n");
      expect(sourceText, `${packageName} should use platform debug helpers`).toContain(
        "@nebutra/capability-kit/debug",
      );
    }

    expect(violations).toEqual([]);
  });

  it("centralizes capability tenant fallback selection in @nebutra/capability-kit", () => {
    const capabilityKit = readPackageJson(CAPABILITY_KIT_DIR);
    expect(capabilityKit.nebutra?.surface).toBe("support-contract");

    const kitSource = readFileSync(join(CAPABILITY_KIT_DIR, "src", "index.ts"), "utf8");
    expect(kitSource).toContain("selectCapabilityTenant");
    expect(kitSource).toContain("requireCapabilityTenant");

    const violations: string[] = [];
    for (const packageName of CAPABILITY_TENANT_FALLBACK_CONSUMERS) {
      const entry = byName.get(packageName);
      expect(entry, packageName).toBeDefined();
      if (!entry) continue;

      expect(entry.manifest.dependencies?.["@nebutra/capability-kit"], packageName).toBe(
        "workspace:*",
      );

      const sourceText = collectProductionSourceFiles(join(entry.dir, "src"))
        .map((file) => {
          const source = readFileSync(file, "utf8");
          if (/function\s+requireTenant\b/.test(source)) {
            violations.push(`${file.replace(`${ROOT}/`, "")}: local requireTenant`);
          }
          return source;
        })
        .join("\n");
      expect(sourceText, `${packageName} should use platform tenant fallback helpers`).toContain(
        "requireCapabilityTenant",
      );
    }

    expect(violations).toEqual([]);
  });

  it("keeps BrandContext as a single support-contract-owned fact", () => {
    const violations: string[] = [];
    const owner = byName.get("@nebutra/generation-context");
    expect(owner?.manifest.nebutra?.surface).toBe("support-contract");

    for (const { dir, manifest } of packages) {
      if (manifest.name === "@nebutra/generation-context") continue;
      for (const file of collectProductionSourceFiles(join(dir, "src"))) {
        const source = readFileSync(file, "utf8");
        if (/^\s*(?:export\s+)?(?:interface|type)\s+BrandContext\s*(?:[=<{])/m.test(source)) {
          violations.push(file.replace(`${ROOT}/`, ""));
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps media storyboard plan ownership in @nebutra/reel/storyboard", () => {
    const reel = byName.get("@nebutra/reel");
    const videoPipeline = byName.get("@nebutra/video-pipeline");
    expect(reel, "@nebutra/reel").toBeDefined();
    expect(videoPipeline, "@nebutra/video-pipeline").toBeDefined();
    if (!reel || !videoPipeline) return;

    expect(reel.manifest.nebutra?.surface).toBe("media-graph");
    expect(videoPipeline.manifest.dependencies?.["@nebutra/reel"]).toBe("workspace:*");

    const reelStoryboardSource = readFileSync(
      join(reel.dir, "src", "storyboard", "shot.ts"),
      "utf8",
    );
    expect(reelStoryboardSource).toMatch(/export\s+interface\s+StoryboardScene\b/);
    expect(reelStoryboardSource).toMatch(/export\s+interface\s+StoryboardPlan\b/);

    const videoSource = readFileSync(join(videoPipeline.dir, "src", "index.ts"), "utf8");
    expect(videoSource).toContain("@nebutra/reel/storyboard");
    expect(videoSource).not.toMatch(/export\s+interface\s+StoryboardScene\b/);
    expect(videoSource).not.toMatch(/export\s+interface\s+Storyboard\b/);
  });

  it("keeps command approval policy ownership in @nebutra/execution-policy", () => {
    const policy = byName.get("@nebutra/execution-policy");
    const runtime = byName.get("@nebutra/agent-runtime");
    const codeExecution = byName.get("@nebutra/code-execution");
    expect(policy, "@nebutra/execution-policy").toBeDefined();
    expect(runtime, "@nebutra/agent-runtime").toBeDefined();
    expect(codeExecution, "@nebutra/code-execution").toBeDefined();
    if (!policy || !runtime || !codeExecution) return;

    expect(policy.manifest.nebutra?.surface).toBe("support-contract");
    expect(runtime.manifest.dependencies?.["@nebutra/execution-policy"]).toBe("workspace:*");
    expect(codeExecution.manifest.dependencies?.["@nebutra/execution-policy"]).toBe("workspace:*");

    const policySource = readFileSync(join(policy.dir, "src", "index.ts"), "utf8");
    expect(policySource).toContain("DEFAULT_SHELL_APPROVAL_RULES");
    expect(policySource).toContain("shellApprovalRequired");

    const codeSource = readFileSync(join(codeExecution.dir, "src", "index.ts"), "utf8");
    expect(codeSource).toContain("@nebutra/execution-policy");
    expect(codeSource).not.toMatch(/export\s+interface\s+PolicyRule\b/);
    expect(codeSource).not.toMatch(
      /export\s+const\s+DefaultPolicy\s*:\s*readonly\s+PolicyRule\[\]/,
    );
    expect(codeSource).not.toMatch(/function\s+matchesRule\b/);

    const runtimeCompatSource = readFileSync(
      join(runtime.dir, "src", "permission-ruleset.ts"),
      "utf8",
    );
    expect(runtimeCompatSource.trim()).toBe('export * from "@nebutra/execution-policy";');
  });

  it("keeps file-truth frontmatter ownership in @nebutra/content-store", () => {
    const contentStore = byName.get("@nebutra/content-store");
    const documentPipeline = byName.get("@nebutra/document-pipeline");
    expect(contentStore, "@nebutra/content-store").toBeDefined();
    expect(documentPipeline, "@nebutra/document-pipeline").toBeDefined();
    if (!contentStore || !documentPipeline) return;

    expect(contentStore.manifest.nebutra?.surface).toBe("persistence");
    expect(documentPipeline.manifest.dependencies?.["@nebutra/content-store"]).toBe("workspace:*");

    const contentSource = readFileSync(join(contentStore.dir, "src", "index.ts"), "utf8");
    expect(contentSource).toContain("parseContentFrontmatter");
    expect(contentSource).toContain("serializeContentFrontmatter");
    expect(contentSource).toContain("splitContentParagraphs");

    const documentSource = readFileSync(join(documentPipeline.dir, "src", "index.ts"), "utf8");
    expect(documentSource).toContain("parseContentFrontmatter");
    expect(documentSource).toContain("serializeContentFrontmatter");
    expect(documentSource).toContain("splitContentParagraphs");
    expect(documentSource).not.toMatch(/function\s+parseFrontmatter\b/);
    expect(documentSource).not.toMatch(/function\s+chunkParagraphs\b/);
  });

  it("keeps deterministic local embedding ownership in @nebutra/local-embedding", () => {
    const localEmbedding = byName.get("@nebutra/local-embedding");
    const contentStore = byName.get("@nebutra/content-store");
    const knowledgeRag = byName.get("@nebutra/knowledge-rag");
    expect(localEmbedding, "@nebutra/local-embedding").toBeDefined();
    expect(contentStore, "@nebutra/content-store").toBeDefined();
    expect(knowledgeRag, "@nebutra/knowledge-rag").toBeDefined();
    if (!localEmbedding || !contentStore || !knowledgeRag) return;

    expect(localEmbedding.manifest.nebutra?.surface).toBe("support-contract");
    expect(contentStore.manifest.dependencies?.["@nebutra/local-embedding"]).toBe("workspace:*");
    expect(knowledgeRag.manifest.dependencies?.["@nebutra/local-embedding"]).toBe("workspace:*");

    const localEmbeddingSource = readFileSync(join(localEmbedding.dir, "src", "index.ts"), "utf8");
    expect(localEmbeddingSource).toContain("embedTextLocal");
    expect(localEmbeddingSource).toContain("tokenizeLocalEmbeddingText");

    for (const entry of [contentStore, knowledgeRag]) {
      for (const file of collectProductionSourceFiles(join(entry.dir, "src"))) {
        const source = readFileSync(file, "utf8");
        expect(source, file.replace(`${ROOT}/`, "")).not.toMatch(/function\s+fnv1a\b/);
        expect(source, file.replace(`${ROOT}/`, "")).not.toMatch(/function\s+hashToken\b/);
      }
    }
  });

  it("centralizes public-disclosure safety in @nebutra/ecosystem-safety", () => {
    const safety = byName.get("@nebutra/ecosystem-safety");
    expect(safety, "@nebutra/ecosystem-safety").toBeDefined();
    if (!safety) return;

    expect(safety.manifest.nebutra?.surface).toBe("support-contract");

    const safetySource = readFileSync(join(safety.dir, "src", "index.ts"), "utf8");
    expect(safetySource).toContain("scanForSensitiveFields");
    expect(safetySource).toContain("assertPublicDisclosureSafe");

    for (const packageName of PUBLIC_DISCLOSURE_SAFETY_CONSUMERS) {
      const entry = byName.get(packageName);
      expect(entry, packageName).toBeDefined();
      if (!entry) continue;

      expect(entry.manifest.dependencies?.["@nebutra/ecosystem-safety"], packageName).toBe(
        "workspace:*",
      );

      const source = readFileSync(join(entry.dir, "src", "index.ts"), "utf8");
      expect(source, packageName).toContain("@nebutra/ecosystem-safety");
      expect(source, packageName).not.toMatch(/const\s+EMAIL_RE\b/);
      expect(source, packageName).not.toMatch(/const\s+SECRET_RE\b/);
      expect(source, packageName).not.toMatch(/function\s+scanForSensitiveFields\b/);
      expect(source, packageName).not.toMatch(/export\s+interface\s+SensitiveField\b/);
    }
  });

  it("keeps ecosystem publication and consent concepts intentionally separate", () => {
    const ideaPlaza = byName.get("@nebutra/idea-plaza");
    const cemetery = byName.get("@nebutra/founder-cemetery");
    const match = byName.get("@nebutra/cofounder-match");
    expect(ideaPlaza, "@nebutra/idea-plaza").toBeDefined();
    expect(cemetery, "@nebutra/founder-cemetery").toBeDefined();
    expect(match, "@nebutra/cofounder-match").toBeDefined();
    if (!ideaPlaza || !cemetery || !match) return;

    const ideaSource = readFileSync(join(ideaPlaza.dir, "src", "index.ts"), "utf8");
    const cemeterySource = readFileSync(join(cemetery.dir, "src", "index.ts"), "utf8");
    const matchSource = readFileSync(join(match.dir, "src", "index.ts"), "utf8");

    expect(ideaSource).toContain(
      'export type IdeaPublishLevel = "surface" | "detail" | "cloneable"',
    );
    expect(ideaSource).not.toMatch(/export\s+type\s+PublishLevel\b/);
    expect(cemeterySource).toContain(
      'export type MemorialPublishLevel = "private" | "community" | "public"',
    );
    expect(cemeterySource).not.toContain("IdeaPublishLevel");
    expect(matchSource).not.toContain("consentSignatures");
    expect(matchSource).not.toContain("MemorialPublishLevel");
  });

  it("keeps knowledge-base above existing ingestion and retrieval primitives", () => {
    const knowledgeBase = byName.get("@nebutra/knowledge-base");
    const knowledgeGraph = byName.get("@nebutra/knowledge-graph");
    const knowledgeRag = byName.get("@nebutra/knowledge-rag");
    const contentStore = byName.get("@nebutra/content-store");
    const documentPipeline = byName.get("@nebutra/document-pipeline");
    expect(knowledgeBase, "@nebutra/knowledge-base").toBeDefined();
    expect(knowledgeGraph, "@nebutra/knowledge-graph").toBeDefined();
    expect(knowledgeRag, "@nebutra/knowledge-rag").toBeDefined();
    expect(contentStore, "@nebutra/content-store").toBeDefined();
    expect(documentPipeline, "@nebutra/document-pipeline").toBeDefined();
    if (!knowledgeBase || !knowledgeGraph || !knowledgeRag || !contentStore || !documentPipeline) {
      return;
    }

    expect(knowledgeBase.manifest.nebutra?.surface).toBe("knowledge-product");
    expect(knowledgeGraph.manifest.nebutra?.surface).toBe("semantic-index");
    expect(knowledgeBase.manifest.dependencies?.["@nebutra/knowledge-graph"]).toBe("workspace:*");
    expect(knowledgeBase.manifest.dependencies?.["@nebutra/knowledge-rag"]).toBe("workspace:*");
    expect(knowledgeBase.manifest.dependencies?.["@nebutra/content-store"]).toBe("workspace:*");
    expect(knowledgeBase.manifest.dependencies?.["@nebutra/document-pipeline"]).toBe("workspace:*");

    const source = readFileSync(join(knowledgeBase.dir, "src", "index.ts"), "utf8");
    expect(source).toContain("@nebutra/knowledge-graph");
    expect(source).toContain("@nebutra/knowledge-rag");
    expect(source).toContain("@nebutra/document-pipeline");
    expect(source).toContain("@nebutra/content-store");
    expect(source).not.toMatch(/class\s+LocalHashEmbedder\b/);
    expect(source).not.toMatch(/class\s+RecursiveCharChunker\b/);
    expect(source).not.toMatch(/class\s+InMemoryVectorStore\b/);
    expect(source).not.toMatch(/function\s+localGraph\b/);
    expect(source).not.toMatch(/text\.matchAll\(\s*\/\\b\[A-Z\]/);
  });

  it("keeps brand-genesis as a play product over lower generation capabilities", () => {
    const brandGenesis = byName.get("@nebutra/brand-genesis");
    expect(brandGenesis, "@nebutra/brand-genesis").toBeDefined();
    if (!brandGenesis) return;

    expect(brandGenesis.manifest.nebutra?.surface).toBe("play-product");
    expect(brandGenesis.manifest.dependencies?.["@nebutra/play-loader"]).toBe("workspace:*");
    expect(brandGenesis.manifest.dependencies?.["@nebutra/generation-context"]).toBe("workspace:*");
    expect(brandGenesis.manifest.dependencies?.["@nebutra/image-pipeline"]).toBe("workspace:*");
    expect(brandGenesis.manifest.dependencies?.["@nebutra/video-pipeline"]).toBe("workspace:*");
    expect(brandGenesis.manifest.dependencies?.["@nebutra/audio-pipeline"]).toBe("workspace:*");
    expect(brandGenesis.manifest.dependencies?.["@nebutra/voice-realtime"]).toBe("workspace:*");
    expect(brandGenesis.manifest.dependencies?.["@nebutra/3d-pipeline"]).toBe("workspace:*");

    expect(importViolations(brandGenesis.dir, PLAY_PRODUCT_FORBIDDEN_IMPORTS)).toEqual([]);
    expect(existsSync(join(brandGenesis.dir, "plays", "brand_film_60s", "SKILL.md"))).toBe(true);

    const source = readFileSync(join(brandGenesis.dir, "src", "index.ts"), "utf8");
    expect(source).toContain("@nebutra/generation-context");
    expect(source).toContain("@nebutra/image-pipeline");
    expect(source).toContain("@nebutra/video-pipeline");
    expect(source).not.toMatch(/export\s+interface\s+BrandContext\b/);
    expect(source).not.toMatch(/class\s+ImagePipeline\b/);
    expect(source).not.toMatch(/class\s+VideoPipeline\b/);
  });

  it("keeps Layer 6 play products as SKILL.md orchestration packages", () => {
    const expected = [
      {
        name: "@nebutra/landing-builder",
        skill: ["plays", "one_pager", "SKILL.md"],
        required: ["@nebutra/play-loader", "@nebutra/generation-context", "@nebutra/content-store"],
        forbiddenSource: [
          /class\s+BrandContext\b/,
          /class\s+CodeExecutor\b/,
          /class\s+VitePreview\b/,
        ],
      },
      {
        name: "@nebutra/outreach-engine",
        skill: ["plays", "outreach_campaign", "SKILL.md"],
        required: ["@nebutra/play-loader", "@nebutra/content-store"],
        forbiddenSource: [/class\s+EmailSender\b/, /class\s+CrmClient\b/, /class\s+LeadDatabase\b/],
      },
      {
        name: "@nebutra/support-deflector",
        skill: ["plays", "ticket_triage", "SKILL.md"],
        required: ["@nebutra/play-loader", "@nebutra/content-store"],
        forbiddenSource: [
          /class\s+SupportChannelBridge\b/,
          /class\s+MessagingBridge\b/,
          /class\s+EmailChannel\b/,
        ],
      },
    ];

    for (const item of expected) {
      const pkg = byName.get(item.name);
      expect(pkg, item.name).toBeDefined();
      if (!pkg) continue;
      expect(pkg.manifest.nebutra?.surface).toBe("play-product");
      for (const dependency of item.required) {
        expect(pkg.manifest.dependencies?.[dependency], `${item.name} ${dependency}`).toBe(
          "workspace:*",
        );
      }
      expect(importViolations(pkg.dir, PLAY_PRODUCT_FORBIDDEN_IMPORTS)).toEqual([]);
      expect(existsSync(join(pkg.dir, ...item.skill))).toBe(true);
      const source = readFileSync(join(pkg.dir, "src", "index.ts"), "utf8");
      for (const pattern of item.forbiddenSource) {
        expect(source).not.toMatch(pattern);
      }
    }
  });

  it("keeps Layer 7 ecosystem products above lower primitives without re-owning them", () => {
    const expected = [
      {
        name: "@nebutra/time-machine",
        skill: ["plays", "timeline_view", "SKILL.md"],
        required: ["@nebutra/event-log", "@nebutra/content-store"],
        forbiddenSource: [/class\s+EventLog\b/, /class\s+ContentStore\b/, /rollbackApply\b/],
      },
      {
        name: "@nebutra/idea-plaza",
        skill: ["plays", "publish_idea", "SKILL.md"],
        required: ["@nebutra/event-log", "@nebutra/content-store"],
        forbiddenSource: [/class\s+GlobalRegistry\b/, /class\s+ModerationQueue\b/],
      },
      {
        name: "@nebutra/founder-cemetery",
        skill: ["plays", "close_company", "SKILL.md"],
        required: ["@nebutra/event-log", "@nebutra/content-store"],
        forbiddenSource: [/deleteCompany\b/, /class\s+LegalSignatureProvider\b/],
      },
      {
        name: "@nebutra/cofounder-match",
        skill: ["plays", "seek_cofounder", "SKILL.md"],
        required: ["@nebutra/event-log", "@nebutra/content-store"],
        forbiddenSource: [/class\s+ChatTransport\b/, /class\s+IdentityProvider\b/],
      },
      {
        name: "@nebutra/play-marketplace",
        skill: ["plays", "publish_play", "SKILL.md"],
        required: ["@nebutra/play-loader", "@nebutra/event-log", "@nebutra/content-store"],
        forbiddenSource: [/parseSkillFrontmatter\b/, /from\s+["']yaml["']/],
      },
    ];

    expect(expected.map((item) => item.name)).toEqual([...ECOSYSTEM_PRODUCT_PACKAGES]);

    for (const item of expected) {
      const pkg = byName.get(item.name);
      expect(pkg, item.name).toBeDefined();
      if (!pkg) continue;
      expect(pkg.manifest.nebutra?.surface).toBe("ecosystem-product");
      for (const dependency of item.required) {
        expect(pkg.manifest.dependencies?.[dependency], `${item.name} ${dependency}`).toBe(
          "workspace:*",
        );
      }
      expect(importViolations(pkg.dir, ECOSYSTEM_PRODUCT_FORBIDDEN_IMPORTS)).toEqual([]);
      expect(existsSync(join(pkg.dir, ...item.skill))).toBe(true);
      expect(existsSync(join(pkg.dir, "README.md")), item.name).toBe(true);

      const examplesDir = join(pkg.dir, "examples");
      const exampleCount = existsSync(examplesDir)
        ? readdirSync(examplesDir).filter((name) => name.endsWith(".ts")).length
        : 0;
      expect(exampleCount, item.name).toBeGreaterThanOrEqual(3);

      const source = readFileSync(join(pkg.dir, "src", "index.ts"), "utf8");
      for (const pattern of item.forbiddenSource) {
        expect(source).not.toMatch(pattern);
      }
    }

    const marketplace = byName.get("@nebutra/play-marketplace");
    expect(marketplace).toBeDefined();
    if (marketplace) {
      const source = readFileSync(join(marketplace.dir, "src", "index.ts"), "utf8");
      expect(source).toContain("parsePlayMarkdown");
    }
  });

  it("keeps SKILL.md parsing ownership in @nebutra/tool-registry", () => {
    const toolRegistry = byName.get("@nebutra/tool-registry");
    const playLoader = byName.get("@nebutra/play-loader");
    const agentRuntime = byName.get("@nebutra/agent-runtime");
    expect(toolRegistry, "@nebutra/tool-registry").toBeDefined();
    expect(playLoader, "@nebutra/play-loader").toBeDefined();
    expect(agentRuntime, "@nebutra/agent-runtime").toBeDefined();
    if (!toolRegistry || !playLoader || !agentRuntime) return;

    expect(toolRegistry.manifest.nebutra?.surface).toBe("tool-registry");
    expect(playLoader.manifest.dependencies?.["@nebutra/tool-registry"]).toBe("workspace:*");

    const toolRegistrySource = readFileSync(join(toolRegistry.dir, "src", "index.ts"), "utf8");
    expect(toolRegistrySource).toContain("parseSkillFrontmatter");
    expect(toolRegistrySource).toContain("frontmatter: ParsedFrontmatter");

    const playLoaderSource = readFileSync(join(playLoader.dir, "src", "index.ts"), "utf8");
    expect(playLoaderSource).toContain("parseSkillMarkdown");
    expect(playLoaderSource).not.toContain("parseSkillFrontmatter(markdown)");
    expect(playLoaderSource).not.toContain('from "yaml"');

    const runtimeDefinitionSource = readFileSync(
      join(agentRuntime.dir, "src", "definitions.ts"),
      "utf8",
    );
    expect(runtimeDefinitionSource).toContain("DefinitionResolver");
    expect(runtimeDefinitionSource).toContain("SOURCE_TIERS");
    expect(runtimeDefinitionSource).toContain("modelInvocable");
  });

  it("names the agent-runtime tool dispatcher separately from SKILL.md registry ownership", () => {
    const agentRuntime = byName.get("@nebutra/agent-runtime");
    expect(agentRuntime, "@nebutra/agent-runtime").toBeDefined();
    if (!agentRuntime) return;

    const runtimeToolsSource = readFileSync(join(agentRuntime.dir, "src", "tools.ts"), "utf8");
    expect(runtimeToolsSource).toMatch(/export\s+class\s+RuntimeToolRegistry\b/);
    expect(runtimeToolsSource).toContain("RuntimeToolRegistry as ToolRegistry");
  });
});
