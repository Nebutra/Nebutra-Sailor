import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { CapabilityError } from "@nebutra/errors";
import { parseSkillFrontmatter, parseSkillMarkdown, type SkillMeta } from "@nebutra/tool-registry";

export interface PlayDependency {
  readonly play: string;
  readonly outputs: readonly string[];
}

export interface PlaySubagent {
  readonly role: string;
  readonly allowedSkills: readonly string[];
}

export interface PlayMeta extends SkillMeta {
  readonly kind: "play";
}

export interface LoadedPlay {
  readonly meta: PlayMeta;
  readonly body: string;
  readonly requiredSkills: readonly string[];
  readonly subAgents: readonly PlaySubagent[];
  readonly dependsOnPlays: readonly PlayDependency[];
}

export interface PlayNode {
  readonly name: string;
  readonly dependsOn: readonly string[];
}

export interface PlayTestReport {
  readonly name: string;
  readonly ok: boolean;
  readonly checks: readonly string[];
  readonly suggestion?: string;
}

export interface PlayLoaderDoctorReport {
  readonly ok: boolean;
  readonly plays: number;
  readonly root: string;
  readonly suggestion?: string;
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

function normalizePlayName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function playDebugPath(): string {
  return join(process.cwd(), ".nebutra", "debug", "play-loader.jsonl");
}

async function appendPlayDebug(entry: Record<string, unknown>): Promise<void> {
  const path = playDebugPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, {
    flag: "a",
  });
}

export async function readPlayDebug(limit = 10): Promise<unknown[]> {
  try {
    const raw = await readFile(playDebugPath(), "utf8");
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(-limit)
      .map((line) => JSON.parse(line) as unknown);
  } catch {
    return [];
  }
}

function parseSubagents(value: unknown): PlaySubagent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): PlaySubagent[] => {
    const record = asRecord(item);
    const role = asString(record?.role);
    if (!record || !role) return [];
    return [{ role, allowedSkills: asStringArray(record.allowed_skills) }];
  });
}

function parsePlayDependencies(value: unknown): PlayDependency[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): PlayDependency[] => {
    if (typeof item === "string") return [{ play: item, outputs: [] }];
    const record = asRecord(item);
    const play = asString(record?.play);
    if (!record || !play) return [];
    return [{ play, outputs: asStringArray(record.outputs) }];
  });
}

export function parsePlayMarkdown(markdown: string): LoadedPlay {
  const loaded = parseSkillMarkdown(markdown);
  const { frontmatter } = parseSkillFrontmatter(markdown);
  if (frontmatter.kind !== "play") {
    throw new CapabilityError("play-loader", "Play SKILL.md must set kind: play", {
      suggestion: "Set `kind: play` in frontmatter or keep this document in tool-registry only.",
      statusCode: 400,
      metadata: { name: loaded.meta.name, kind: frontmatter.kind },
    });
  }

  return {
    meta: { ...loaded.meta, kind: "play" },
    body: loaded.body,
    requiredSkills: asStringArray(frontmatter.required_skills),
    subAgents: parseSubagents(frontmatter.sub_agents),
    dependsOnPlays: parsePlayDependencies(frontmatter.depends_on_plays),
  };
}

export function resolvePlayChain(nodes: readonly PlayNode[]): readonly string[] {
  const byName = new Map(nodes.map((node) => [node.name, node]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const ordered: string[] = [];

  const visit = (name: string): void => {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      throw new CapabilityError("play-loader", "Play dependency cycle detected", {
        suggestion: "Remove the cycle or merge mutually dependent plays into one declaration.",
        statusCode: 400,
        metadata: { name },
      });
    }
    visiting.add(name);
    const node = byName.get(name);
    for (const dependency of node?.dependsOn ?? []) visit(dependency);
    visiting.delete(name);
    visited.add(name);
    ordered.push(name);
  };

  for (const node of nodes) visit(node.name);
  return ordered;
}

export class PlayLoader {
  readonly #root: string;
  readonly #plays = new Map<string, { readonly meta: PlayMeta; readonly path: string }>();

  private constructor(root: string) {
    this.#root = root;
  }

  static async open(root: string): Promise<PlayLoader> {
    const loader = new PlayLoader(root);
    await mkdir(loader.playsRoot(), { recursive: true });
    await loader.reload();
    return loader;
  }

  playsRoot(): string {
    return join(this.#root, "plays");
  }

  async writePlay(name: string, markdown: string): Promise<void> {
    const normalized = normalizePlayName(name);
    const parsed = parsePlayMarkdown(markdown);
    if (parsed.meta.name !== normalized) {
      throw new CapabilityError("play-loader", "Play name does not match path", {
        suggestion: "Use the same lowercase codename in the path and SKILL.md frontmatter.",
        metadata: { pathName: normalized, playName: parsed.meta.name },
        statusCode: 400,
      });
    }
    const path = join(this.playsRoot(), normalized, "SKILL.md");
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, markdown, "utf8");
    await this.reload();
    await appendPlayDebug({ type: "write", play: normalized });
  }

  async newPlay(name: string): Promise<LoadedPlay> {
    const normalized = normalizePlayName(name);
    const markdown = [
      "---",
      `name: ${normalized}`,
      "kind: play",
      "version: 1.0.0",
      `description: ${normalized.replaceAll("_", " ")} play`,
      "required_skills: []",
      "sub_agents: []",
      "depends_on_plays: []",
      "---",
      "",
      "## What this play does",
      "",
      "Describe the user story and expected output.",
    ].join("\n");
    await this.writePlay(normalized, markdown);
    return this.load(normalized);
  }

  async reload(): Promise<void> {
    this.#plays.clear();
    for (const file of await walk(this.playsRoot())) {
      if (!file.endsWith("SKILL.md")) continue;
      const raw = await readFile(file, "utf8");
      const play = parsePlayMarkdown(raw);
      this.#plays.set(play.meta.name, { meta: play.meta, path: relative(this.#root, file) });
    }
    await appendPlayDebug({ type: "reload", plays: this.#plays.size });
  }

  async list(): Promise<PlayMeta[]> {
    return [...this.#plays.values()]
      .map((entry) => entry.meta)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async load(name: string): Promise<LoadedPlay> {
    const play = this.#plays.get(normalizePlayName(name));
    if (!play) {
      throw new CapabilityError("play-loader", "Play not found", {
        suggestion: "Run `pnpm play:list` or create it with `pnpm play:new <name>`.",
        metadata: { name },
        statusCode: 404,
      });
    }
    const loaded = parsePlayMarkdown(await readFile(join(this.#root, play.path), "utf8"));
    await appendPlayDebug({ type: "load", play: loaded.meta.name });
    return loaded;
  }

  async install(source: string): Promise<LoadedPlay> {
    if (!source.startsWith("file:")) {
      throw new CapabilityError("play-loader", "Only file installs are enabled locally", {
        suggestion:
          "Download remote plays through a reviewed distribution workflow, then install with file:<path>.",
        metadata: { source },
        statusCode: 400,
      });
    }
    const raw = await readFile(source.slice("file:".length), "utf8");
    const play = parsePlayMarkdown(raw);
    await this.writePlay(play.meta.name, raw);
    return this.load(play.meta.name);
  }

  async test(name: string): Promise<PlayTestReport> {
    try {
      const play = await this.load(name);
      return {
        name: play.meta.name,
        ok: play.body.length > 0,
        checks: ["frontmatter", "kind:play", "body", "dependency-dag"],
        ...(!play.body ? { suggestion: "Add a markdown body after the frontmatter." } : {}),
      };
    } catch (error) {
      return {
        name,
        ok: false,
        checks: [],
        suggestion:
          error instanceof CapabilityError
            ? "Create the play with `pnpm play:new <name>` or fix its SKILL.md metadata."
            : "Run `pnpm play:list` and verify the play directory exists.",
      };
    }
  }

  async doctor(): Promise<PlayLoaderDoctorReport> {
    const plays = this.#plays.size;
    return {
      ok: plays > 0,
      plays,
      root: this.#root,
      ...(plays === 0 ? { suggestion: "Create a play with `pnpm play:new <name>`." } : {}),
    };
  }
}
