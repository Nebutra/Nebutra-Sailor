/**
 * Project location resolution for create-sailor.
 *
 * Two real user intents:
 *   1. "I'm in a parent/home dir" → create a new folder (name only, no path UX)
 *   2. "I already cd'd into an empty dir" → scaffold here (.)
 *
 * Path syntax (`./foo`, `/abs`, `../x`) is still accepted when the user types
 * it or passes a CLI arg — but interactive prompts never force it.
 */

import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";

/** Default folder name when the user just hits Enter / --yes. */
export const DEFAULT_PROJECT_NAME = "my-app";

/** Entries that do not count as "content" when deciding if cwd is empty. */
const HARMLESS_ENTRIES = new Set([
  ".DS_Store",
  ".Spotlight-V100",
  ".Trashes",
  "Thumbs.db",
  "desktop.ini",
]);

/** Presence of these means: never scaffold into current dir without a hard stop. */
const BLOCKING_ENTRIES = new Set([
  "package.json",
  "node_modules",
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
  "yarn.lock",
  "package-lock.json",
  "bun.lockb",
  "turbo.json",
]);

export type LocationChoice = "new" | "current";

export interface ResolvedProjectTarget {
  /** Relative or absolute path passed to scaffold (e.g. `./my-app`, `.`). */
  targetDir: string;
  /** Basename used for package.json name, banners, etc. */
  projectName: string;
  /** Absolute path for display / existence checks. */
  absoluteDir: string;
}

export function isCurrentDirToken(value: string): boolean {
  const v = value.trim();
  return v === "." || v === "./" || v === ".\\";
}

/**
 * Returns true when the directory has no meaningful project content
 * (empty, missing, or only OS junk / a bare .git).
 */
export function isDirEffectivelyEmpty(dir: string): boolean {
  if (!fs.existsSync(dir)) return true;
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return false;
  }
  return entries.every((name) => HARMLESS_ENTRIES.has(name) || name === ".git");
}

/**
 * Returns true when scaffolding into this dir would almost certainly clobber
 * an existing app/monorepo.
 */
export function hasBlockingProjectMarkers(dir: string): boolean {
  if (!fs.existsSync(dir)) return false;
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return true;
  }
  return entries.some((name) => BLOCKING_ENTRIES.has(name));
}

/**
 * Prefer "current directory" when cwd looks empty (user already mkdir+cd'd).
 * Prefer "new folder" when cwd is busy (home, monorepo parent, etc.).
 */
export function preferCurrentDirectory(cwd: string = process.cwd()): boolean {
  return isDirEffectivelyEmpty(cwd) && !hasBlockingProjectMarkers(cwd);
}

/**
 * Validate a bare project *name* (not a path).
 * Allows letters, digits, `_`, `.`, `-` — same spirit as npm package names.
 */
export function validateProjectName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Please enter a project name.";
  if (trimmed.length > 128) return "Name is too long (max 128 characters).";
  if (isCurrentDirToken(trimmed)) return undefined;
  if (/[\\/]/.test(trimmed) || path.isAbsolute(trimmed)) {
    // Path-shaped input is validated elsewhere.
    return undefined;
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(trimmed)) {
    return "Use letters, numbers, dots, underscores, or hyphens (start with a letter or number).";
  }
  return undefined;
}

/**
 * Resolve a CLI arg or typed value into a scaffold target.
 *
 * - `.` / `./` → current directory
 * - path with `/` or `\` or absolute → treat as path
 * - bare name → `./name`
 */
export function resolveTargetFromInput(
  input: string,
  cwd: string = process.cwd(),
): ResolvedProjectTarget {
  const raw = input.trim() || DEFAULT_PROJECT_NAME;

  if (isCurrentDirToken(raw)) {
    const absoluteDir = path.resolve(cwd);
    return {
      targetDir: ".",
      projectName: path.basename(absoluteDir) || DEFAULT_PROJECT_NAME,
      absoluteDir,
    };
  }

  const looksLikePath =
    path.isAbsolute(raw) ||
    raw.startsWith("./") ||
    raw.startsWith(".\\") ||
    raw.startsWith("../") ||
    raw.startsWith("..\\") ||
    raw.includes("/") ||
    raw.includes("\\");

  if (looksLikePath) {
    const absoluteDir = path.resolve(cwd, raw);
    return {
      targetDir: raw,
      projectName: path.basename(absoluteDir) || DEFAULT_PROJECT_NAME,
      absoluteDir,
    };
  }

  const nameError = validateProjectName(raw);
  if (nameError) {
    throw new Error(nameError);
  }

  const targetDir = `./${raw}`;
  const absoluteDir = path.resolve(cwd, raw);
  return {
    targetDir,
    projectName: raw,
    absoluteDir,
  };
}

export interface PromptProjectTargetOptions {
  /** Pre-bound cancel handler (exit process etc.). */
  onCancel?: () => void;
  cwd?: string;
}

/**
 * Interactive location flow:
 *   1. Create in a new folder? Or current directory?
 *   2. If new folder → project name (default my-app)
 *   3. If current → empty check / confirm when not empty
 */
export async function promptProjectTarget(
  opts: PromptProjectTargetOptions = {},
): Promise<ResolvedProjectTarget> {
  const cwd = opts.cwd ?? process.cwd();
  const onCancel =
    opts.onCancel ??
    (() => {
      process.stdout.write("Cancelled\n");
      process.exit(130);
    });

  const preferCurrent = preferCurrentDirectory(cwd);

  const cwdLabel = path.basename(cwd) || cwd;

  const location = await p.select({
    message: "Create the project…",
    options: [
      {
        value: "new" as const,
        label: "In a new folder",
        hint: preferCurrent ? undefined : "recommended from home or a parent directory",
      },
      {
        value: "current" as const,
        label: "In the current directory",
        hint: preferCurrent ? `${cwdLabel} looks empty — good to go` : cwd,
      },
    ],
    initialValue: preferCurrent ? ("current" as const) : ("new" as const),
  });

  if (p.isCancel(location)) onCancel();

  if (location === "current") {
    if (hasBlockingProjectMarkers(cwd)) {
      const markers = fs
        .readdirSync(cwd)
        .filter((name) => BLOCKING_ENTRIES.has(name))
        .slice(0, 4)
        .join(", ");
      p.log.error(
        `Current directory already looks like a project (${markers}). ` +
          `Choose a new folder, or pass a different path: create-sailor my-app`,
      );
      onCancel();
    }

    if (!isDirEffectivelyEmpty(cwd)) {
      const cont = await p.confirm({
        message: "Current directory is not empty. Scaffold files will be mixed in — continue?",
        initialValue: false,
      });
      if (p.isCancel(cont) || !cont) onCancel();
    }

    return resolveTargetFromInput(".", cwd);
  }

  // New folder
  const name = await p.text({
    message: "What should we call your project?",
    placeholder: DEFAULT_PROJECT_NAME,
    defaultValue: DEFAULT_PROJECT_NAME,
    validate: (value) => {
      const v = (value ?? "").trim() || DEFAULT_PROJECT_NAME;
      if (isCurrentDirToken(v) || /[\\/]/.test(v) || path.isAbsolute(v)) {
        // Allow power-users to type a path in the name field.
        try {
          resolveTargetFromInput(v, cwd);
          return undefined;
        } catch (err) {
          return err instanceof Error ? err.message : "Invalid path.";
        }
      }
      return validateProjectName(v);
    },
  });

  if (p.isCancel(name)) onCancel();

  const resolved = resolveTargetFromInput(String(name).trim() || DEFAULT_PROJECT_NAME, cwd);

  if (fs.existsSync(resolved.absoluteDir) && !isDirEffectivelyEmpty(resolved.absoluteDir)) {
    if (hasBlockingProjectMarkers(resolved.absoluteDir)) {
      p.log.error(
        `Folder "${resolved.projectName}" already exists and looks like a project. Pick another name.`,
      );
      onCancel();
    }
    const cont = await p.confirm({
      message: `Folder "${resolved.projectName}" is not empty. Continue?`,
      initialValue: false,
    });
    if (p.isCancel(cont) || !cont) onCancel();
  }

  return resolved;
}
