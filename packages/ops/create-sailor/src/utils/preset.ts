import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { encodePreset, type Preset, parsePreset } from "@nebutra/tokens/preset";

/**
 * `--preset <code>`: the new project's look, chosen in Sailor Studio
 * (ADR 2026-09-27 Sailor Studio). The scaffold writes it to
 * packages/design/tokens/project/preset — the one file a project's look lives
 * in — and, once dependencies are installed, renders project.css from it. With
 * no preset the project is factory and nothing is written.
 */

const PROJECT_DIR = ["packages", "design", "tokens", "project"] as const;

/** Parse up front, so a mistyped code fails before anything is downloaded. */
export function readPresetOption(input: string | undefined): Preset | null {
  if (!input) return null;
  return parsePreset(input);
}

const isFactory = (p: Preset) => p.base === "factory" && Object.keys(p).length === 1;

/** Write the preset into the scaffold. Returns the canonical code, or null for factory. */
export function writeScaffoldPreset(target: string, preset: Preset | null): string | null {
  if (!preset || isFactory(preset)) return null;
  const code = encodePreset(preset);
  const dir = join(target, ...PROJECT_DIR);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "preset"), `${code}\n`);
  return code;
}

/** Render project.css from the preset. Needs the installed dependencies (tsx). */
export function renderScaffoldPreset(target: string): void {
  const script = join(target, "packages", "design", "tokens", "scripts", "emit-project.mjs");
  if (!existsSync(script)) return;
  execFileSync(process.execPath, [script], { cwd: target, stdio: "ignore" });
}
