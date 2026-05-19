import { type FSWatcher, watch } from "node:fs";
import { mkdir, readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { appendCapabilityDebug, readCapabilityDebug } from "@nebutra/capability-kit/debug";
import { ContentStore } from "@nebutra/content-store";
import { CapabilityError } from "@nebutra/errors";
import { parse as parseYaml } from "yaml";

export interface ToolRegistryOptions {
  readonly tenantId?: string;
}

export interface SkillMeta {
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly inputs?: Record<string, unknown>;
  readonly outputs?: Record<string, unknown>;
  readonly budget?: Record<string, unknown>;
  readonly allowedTools: readonly string[];
  readonly mcpServers: readonly string[];
}

export interface LoadedSkill {
  readonly meta: SkillMeta;
  readonly body: string;
  readonly path: string;
  readonly frontmatter: ParsedFrontmatter;
}

export interface SkillTestReport {
  readonly name: string;
  readonly ok: boolean;
  readonly checks: readonly string[];
  readonly suggestion?: string;
}

export interface ParsedFrontmatter {
  readonly [key: string]: unknown;
}

export interface ParsedSkillDocument {
  readonly frontmatter: ParsedFrontmatter;
  readonly body: string;
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function normalizeSkillName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function appendSkillDebug(entry: Record<string, unknown>): Promise<void> {
  await appendCapabilityDebug("tool-registry", entry);
}

export async function readSkillDebug(limit = 10): Promise<unknown[]> {
  return readCapabilityDebug("tool-registry", { limit });
}

export function parseSkillFrontmatter(markdown: string): ParsedSkillDocument {
  if (!markdown.startsWith("---\n")) {
    throw new CapabilityError("tool-registry", "SKILL.md frontmatter is required", {
      suggestion: "Create skills with `pnpm skill:new <name>` so required metadata is present.",
      statusCode: 400,
    });
  }
  const end = markdown.indexOf("\n---", 4);
  if (end < 0) {
    throw new CapabilityError("tool-registry", "SKILL.md frontmatter is not closed", {
      suggestion: "Add a closing `---` line before the markdown body.",
      statusCode: 400,
    });
  }
  return {
    frontmatter: (parseYaml(markdown.slice(4, end).trim()) ?? {}) as ParsedFrontmatter,
    body: markdown.slice(end + 4).trim(),
  };
}

export function parseSkillMarkdown(markdown: string): LoadedSkill {
  const { frontmatter, body } = parseSkillFrontmatter(markdown);
  const name = asString(frontmatter.name);
  const description = asString(frontmatter.description);
  const version = asString(frontmatter.version);
  if (!name || !description || !version) {
    throw new CapabilityError("tool-registry", "SKILL.md metadata is incomplete", {
      suggestion: "Set name, description, and version in the frontmatter.",
      metadata: { keys: Object.keys(frontmatter) },
      statusCode: 400,
    });
  }
  const inputs = asRecord(frontmatter.inputs);
  const outputs = asRecord(frontmatter.outputs);
  const budget = asRecord(frontmatter.budget);
  return {
    path: "",
    frontmatter,
    meta: {
      name,
      description,
      version,
      ...(inputs !== undefined && { inputs }),
      ...(outputs !== undefined && { outputs }),
      ...(budget !== undefined && { budget }),
      allowedTools: asStringArray(frontmatter.allowed_tools),
      mcpServers: asStringArray(frontmatter.mcp_servers),
    },
    body,
  };
}

export class ToolRegistry {
  readonly #root: string;
  readonly #store: ContentStore;
  readonly #skills = new Map<string, { meta: SkillMeta; path: string }>();

  private constructor(root: string, store: ContentStore) {
    this.#root = root;
    this.#store = store;
  }

  static async open(root: string, options: ToolRegistryOptions = {}): Promise<ToolRegistry> {
    const store = await ContentStore.open(root, { tenantId: options.tenantId ?? "local" });
    const registry = new ToolRegistry(root, store);
    await mkdir(join(registry.filesRoot(), "skills"), { recursive: true });
    await registry.reload();
    return registry;
  }

  filesRoot(): string {
    return this.#store.filesRoot();
  }

  async writeSkill(name: string, markdown: string): Promise<void> {
    const normalized = normalizeSkillName(name);
    const parsed = parseSkillMarkdown(markdown);
    if (parsed.meta.name !== normalized) {
      throw new CapabilityError("tool-registry", "Skill name does not match path", {
        suggestion: "Use the same lowercase codename in the path and SKILL.md frontmatter.",
        metadata: { pathName: normalized, skillName: parsed.meta.name },
        statusCode: 400,
      });
    }
    await this.#store.write(`skills/${normalized}/SKILL.md`, markdown);
    await this.reload();
    await appendSkillDebug({ type: "write", skill: normalized });
  }

  async newSkill(name: string): Promise<LoadedSkill> {
    const normalized = normalizeSkillName(name);
    const markdown = [
      "---",
      `name: ${normalized}`,
      `description: ${normalized.replaceAll("_", " ")} capability`,
      "version: 1.0.0",
      "allowed_tools: []",
      "mcp_servers: []",
      "---",
      "",
      "## What this skill does",
      "",
      "Describe the capability and when an agent should load the body.",
    ].join("\n");
    await this.writeSkill(normalized, markdown);
    return this.load(normalized);
  }

  async reload(): Promise<void> {
    this.#skills.clear();
    await this.#store.reindex();
    const root = join(this.filesRoot(), "skills");
    for (const file of await walk(root)) {
      if (!file.endsWith("SKILL.md")) continue;
      const raw = await readFile(file, "utf8");
      const parsed = parseSkillMarkdown(raw);
      this.#skills.set(parsed.meta.name, {
        meta: parsed.meta,
        path: relative(this.filesRoot(), file),
      });
    }
    await appendSkillDebug({ type: "reload", skills: this.#skills.size });
  }

  async list(): Promise<SkillMeta[]> {
    return Array.from(this.#skills.values())
      .map((skill) => skill.meta)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async load(name: string): Promise<LoadedSkill> {
    const skill = this.#skills.get(normalizeSkillName(name));
    if (!skill) {
      throw new CapabilityError("tool-registry", "Skill not found", {
        suggestion: "Run `pnpm skill:list` or create it with `pnpm skill:new <name>`.",
        metadata: { name },
        statusCode: 404,
      });
    }
    const raw = await this.#store.read(skill.path);
    const loaded = parseSkillMarkdown(raw);
    await appendSkillDebug({ type: "load", skill: loaded.meta.name });
    return { ...loaded, path: skill.path };
  }

  skill(name: string): { run: (input: Record<string, unknown>) => Promise<unknown> } {
    return {
      run: async (input) => {
        const loaded = await this.load(name);
        return { skill: loaded.meta.name, input };
      },
    };
  }

  async install(source: string): Promise<LoadedSkill> {
    if (!source.startsWith("file:")) {
      throw new CapabilityError("tool-registry", "Only file installs are enabled locally", {
        suggestion:
          "Download remote skills through a reviewed distribution workflow, then install with file:<path>.",
        metadata: { source },
        statusCode: 400,
      });
    }
    const raw = await readFile(source.slice("file:".length), "utf8");
    const parsed = parseSkillMarkdown(raw);
    await this.writeSkill(parsed.meta.name, raw);
    return this.load(parsed.meta.name);
  }

  async test(name: string): Promise<SkillTestReport> {
    try {
      const skill = await this.load(name);
      const checks = ["frontmatter", "body"];
      return {
        name: skill.meta.name,
        ok: skill.body.length > 0,
        checks,
        ...(!skill.body && { suggestion: "Add a markdown body after the frontmatter." }),
      };
    } catch (error) {
      return {
        name,
        ok: false,
        checks: [],
        suggestion:
          error instanceof CapabilityError
            ? "Create the skill with `pnpm skill:new <name>` or fix its SKILL.md metadata."
            : "Run `pnpm skill:list` and verify the skill directory exists.",
      };
    }
  }

  watch(onChange: () => void | Promise<void>): FSWatcher {
    const watcher = watch(this.filesRoot(), { recursive: true }, () => {
      this.reload()
        .then(() => onChange())
        .catch(() => undefined);
    });
    return watcher;
  }

  async doctor(): Promise<{ ok: boolean; skills: number; root: string; suggestion?: string }> {
    const skills = this.#skills.size;
    return {
      ok: skills > 0,
      skills,
      root: this.#root,
      ...(skills === 0 && { suggestion: "Create a skill with `pnpm skill:new <name>`." }),
    };
  }

  async close(): Promise<void> {
    await this.#store.close();
  }
}
