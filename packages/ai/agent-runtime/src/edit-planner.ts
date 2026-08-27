import { z } from "zod";

/**
 * Edit planner — a faithful re-expression of a targeted-edit model for an
 * app-builder agent. Given a natural-language prompt and a manifest of the
 * current project files, it classifies the edit intent, selects the minimal
 * set of files to send to a codegen turn, and provides a terse "fast-apply"
 * format for re-integrating model output.
 *
 * Everything here is deterministic and pure aside from `applyEditBlock`,
 * whose merge step is provider-specific and injected.
 */

export enum EditType {
  UPDATE_COMPONENT = "UPDATE_COMPONENT",
  ADD_FEATURE = "ADD_FEATURE",
  FIX_ISSUE = "FIX_ISSUE",
  REFACTOR = "REFACTOR",
  FULL_REBUILD = "FULL_REBUILD",
  UPDATE_STYLE = "UPDATE_STYLE",
  ADD_DEPENDENCY = "ADD_DEPENDENCY",
}

export type FileKind = "component" | "page" | "style" | "config" | "util" | "other";

export interface FileInfo {
  path: string;
  type: FileKind;
}

export interface FileManifest {
  files: Record<string, FileInfo>;
}

export interface EditIntent {
  type: EditType;
  targetFiles: string[];
  description: string;
}

export interface FileContext {
  primaryFiles: string[];
  contextFiles: string[];
  systemPrompt: string;
  editIntent: EditIntent;
}

export interface EditBlock {
  targetFile: string;
  instructions: string;
  update: string;
}

export type EditMerger = (
  originalContent: string,
  update: string,
  instructions: string,
) => Promise<string>;

export interface ApplyEditResult {
  ok: boolean;
  merged?: string;
  error?: string;
}

const fileManifestSchema = z.object({
  files: z.record(
    z.string(),
    z.object({
      path: z.string(),
      type: z.enum(["component", "page", "style", "config", "util", "other"]),
    }),
  ),
});

// --- pure file resolvers -------------------------------------------------

function allFiles(manifest: FileManifest): string[] {
  return Object.keys(manifest.files);
}

function filesByType(manifest: FileManifest, type: FileKind): string[] {
  return allFiles(manifest).filter((p) => manifest.files[p]?.type === type);
}

/** Match a component file by its base name appearing in the prompt. */
function resolveByComponentName(prompt: string, manifest: FileManifest): string[] {
  const lower = prompt.toLowerCase();
  return allFiles(manifest).filter((p) => {
    const info = manifest.files[p];
    if (!info || (info.type !== "component" && info.type !== "page")) {
      return false;
    }
    const base = (p.split("/").pop() ?? "").replace(/\.[^.]+$/, "");
    return base.length > 0 && lower.includes(base.toLowerCase());
  });
}

/** Feature-insertion points: an App/entry file plus pages. */
function resolveFeatureInsertionPoints(_prompt: string, manifest: FileManifest): string[] {
  const pages = filesByType(manifest, "page");
  const entry = allFiles(manifest).filter((p) => /(^|\/)App\.[tj]sx?$/.test(p));
  return Array.from(new Set([...entry, ...pages]));
}

function resolveStyleFiles(_prompt: string, manifest: FileManifest): string[] {
  return filesByType(manifest, "style");
}

function resolveConfigFiles(_prompt: string, manifest: FileManifest): string[] {
  const configs = filesByType(manifest, "config");
  const pkg = allFiles(manifest).filter((p) => /(^|\/)package\.json$/.test(p));
  return Array.from(new Set([...pkg, ...configs]));
}

/** For FIX: prefer files named in the prompt, else components + pages. */
function resolveProblemFiles(prompt: string, manifest: FileManifest): string[] {
  const named = resolveByComponentName(prompt, manifest);
  if (named.length > 0) return named;
  return [...filesByType(manifest, "component"), ...filesByType(manifest, "page")];
}

// --- pattern-driven intent analysis -------------------------------------

interface IntentPattern {
  patterns: RegExp[];
  type: EditType;
  fileResolver: (prompt: string, manifest: FileManifest) => string[];
}

// Order matters: first matching pattern wins.
const INTENT_PATTERNS: readonly IntentPattern[] = [
  {
    patterns: [/\b(rebuild|recreate|start over|from scratch)\b/i],
    type: EditType.FULL_REBUILD,
    fileResolver: (_p, m) => allFiles(m),
  },
  {
    patterns: [/\b(fix|bug|broken|error|issue|not working|crash)\b/i],
    type: EditType.FIX_ISSUE,
    fileResolver: resolveProblemFiles,
  },
  {
    patterns: [
      /\b(install|add)\b.*\b(package|dependency|dependencies|library|npm|module)\b/i,
      /\b(package|dependency|dependencies)\b.*\b(install|add)\b/i,
    ],
    type: EditType.ADD_DEPENDENCY,
    fileResolver: resolveConfigFiles,
  },
  {
    patterns: [/\b(color|colour|theme|style|styling|css|font|spacing|layout look)\b/i],
    type: EditType.UPDATE_STYLE,
    fileResolver: resolveStyleFiles,
  },
  {
    patterns: [/\b(refactor|clean ?up|reorganize|restructure|simplify)\b/i],
    type: EditType.REFACTOR,
    fileResolver: resolveByComponentName,
  },
  {
    patterns: [/\b(add|create|implement|introduce)\b.*\b(feature|page|section|flow)\b/i],
    type: EditType.ADD_FEATURE,
    fileResolver: resolveFeatureInsertionPoints,
  },
  {
    patterns: [/\b(update|change|modify|edit|adjust|tweak)\b/i],
    type: EditType.UPDATE_COMPONENT,
    fileResolver: resolveByComponentName,
  },
];

export function analyzeEditIntent(prompt: string, manifest: FileManifest): EditIntent {
  const description = prompt.trim();
  for (const pattern of INTENT_PATTERNS) {
    if (pattern.patterns.some((re) => re.test(prompt))) {
      return {
        type: pattern.type,
        targetFiles: [...pattern.fileResolver(prompt, manifest)],
        description,
      };
    }
  }
  return {
    type: EditType.UPDATE_COMPONENT,
    targetFiles: [],
    description,
  };
}

// --- targeted context selection -----------------------------------------

const EDIT_INSTRUCTIONS: Readonly<Record<EditType, string>> = {
  [EditType.UPDATE_COMPONENT]:
    "Modify only the targeted component(s). Preserve unrelated logic, props, and exports.",
  [EditType.ADD_FEATURE]:
    "Introduce the new feature with minimal disruption. Wire it into existing entry/page files.",
  [EditType.FIX_ISSUE]:
    "Diagnose and fix the defect. Make the smallest correct change; do not refactor unrelated code.",
  [EditType.REFACTOR]:
    "Improve internal structure without changing observable behavior or public API.",
  [EditType.FULL_REBUILD]:
    "Regenerate the project. Honor the original intent; you may restructure freely.",
  [EditType.UPDATE_STYLE]:
    "Change styling tokens/rules only. Do not alter component logic or markup structure.",
  [EditType.ADD_DEPENDENCY]:
    "Add the dependency to the manifest and the minimal wiring required to use it.",
};

export function buildEditInstructions(type: EditType): string {
  return EDIT_INSTRUCTIONS[type];
}

function isKeyFile(path: string): boolean {
  return /(^|\/)App\.[tj]sx?$/.test(path) || /(^|\/)package\.json$/.test(path);
}

function buildFileStructureSection(manifest: FileManifest): string {
  const lines = allFiles(manifest)
    .slice()
    .sort()
    .map((p) => `- ${p} (${manifest.files[p]?.type ?? "other"})`);
  return `File structure:\n${lines.join("\n")}`;
}

export function selectFilesForEdit(prompt: string, manifest: FileManifest): FileContext {
  const editIntent = analyzeEditIntent(prompt, manifest);
  const everything = allFiles(manifest);

  if (editIntent.type === EditType.FULL_REBUILD) {
    const systemPrompt = buildEditInstructions(EditType.FULL_REBUILD);
    return {
      primaryFiles: [...everything],
      contextFiles: [],
      systemPrompt,
      editIntent,
    };
  }

  const primarySet = new Set(editIntent.targetFiles);
  const primaryFiles = editIntent.targetFiles.slice().sort();

  const contextSet = new Set(everything.filter((p) => !primarySet.has(p)));
  for (const p of everything) {
    if (isKeyFile(p) && !primarySet.has(p)) {
      contextSet.add(p);
    }
  }
  const contextFiles = Array.from(contextSet).sort();

  const systemPrompt = [
    buildFileStructureSection(manifest),
    "",
    buildEditInstructions(editIntent.type),
  ].join("\n");

  return { primaryFiles, contextFiles, systemPrompt, editIntent };
}

// --- fast-apply ----------------------------------------------------------

/**
 * Terse edit-apply format. A model emits zero or more blocks of the form:
 *
 *   <<<edit file="src/App.tsx">>>
 *   <natural-language instructions describing the change>
 *   ---
 *   <the literal updated/replacement snippet>
 *   <<<end>>>
 *
 * Text outside well-formed blocks is ignored; malformed blocks are skipped.
 */
const EDIT_BLOCK_RE = /<<<edit\s+file="([^"]+)">>>\s*([\s\S]*?)\s*---\s*([\s\S]*?)\s*<<<end>>>/g;

export function parseEditBlocks(text: string): EditBlock[] {
  const blocks: EditBlock[] = [];
  for (const match of text.matchAll(EDIT_BLOCK_RE)) {
    const targetFile = match[1]?.trim() ?? "";
    const instructions = match[2]?.trim() ?? "";
    const update = match[3]?.trim() ?? "";
    if (targetFile.length === 0) continue;
    blocks.push({ targetFile, instructions, update });
  }
  return blocks;
}

/**
 * A trivial deterministic fallback merger: replaces the original content
 * wholesale with the update. Real callers inject an LLM-backed merger.
 */
export const fallbackMerger: EditMerger = async (_originalContent, update) => update;

export async function applyEditBlock(
  originalContent: string,
  block: EditBlock,
  merge: EditMerger = fallbackMerger,
): Promise<ApplyEditResult> {
  try {
    const merged = await merge(originalContent, block.update, block.instructions);
    return { ok: true, merged };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// --- tenant-scoped entry point ------------------------------------------

function assertTenant(tenantId: string): void {
  if (typeof tenantId !== "string" || tenantId.trim().length === 0) {
    throw new Error("edit-planner: tenantId is required (fail-closed)");
  }
}

export async function planEdit(
  tenantId: string,
  prompt: string,
  manifest: FileManifest,
): Promise<FileContext> {
  assertTenant(tenantId);
  const parsed = fileManifestSchema.parse(manifest);
  return selectFilesForEdit(prompt, parsed);
}
