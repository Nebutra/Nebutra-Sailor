import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { encodePreset, type Preset, PresetCodeError, parsePreset } from "@nebutra/tokens/preset";
import type { Command } from "commander";
import { delegate } from "../utils/delegate";
import { ExitCode } from "../utils/exit-codes";
import { logger } from "../utils/logger";

/**
 * `nebutra apply --preset <code>` — put a Sailor Studio preset on this project
 * (ADR 2026-09-27 Sailor Studio). It writes one file,
 * packages/design/tokens/project/preset, and rebuilds the tokens so
 * project.css and ThemeProvider's default mode follow it. Nothing else in the
 * design system is edited.
 */

const TOKENS = ["packages", "design", "tokens"] as const;

/** Knobs `--only` limits the change to; the rest keep the project's current values. */
const ONLY: Record<"theme" | "fonts", readonly (keyof Preset)[]> = {
  theme: ["base", "brandColor", "neutral", "radius", "density", "mode"],
  fonts: ["sans", "heading", "mono", "headingWeight"],
};

export type ApplyOnly = keyof typeof ONLY;

/** The Sailor project containing `from`: the nearest directory with the tokens package. */
export function findProjectRoot(from: string = process.cwd()): string | null {
  let dir = from;
  for (;;) {
    if (existsSync(join(dir, ...TOKENS, "package.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** The preset after applying `next` to `current`, whole or only one group of knobs. */
export function mergePreset(current: Preset | null, next: Preset, only?: ApplyOnly): Preset {
  if (!only) return next;
  const merged: Record<string, unknown> = { ...(current ?? { base: "factory" }) };
  for (const key of ONLY[only]) {
    const value = next[key];
    if (value === undefined) delete merged[key];
    else merged[key] = value;
  }
  return merged as unknown as Preset;
}

const isFactory = (p: Preset) => p.base === "factory" && Object.keys(p).length === 1;

export interface ApplyResult {
  root: string;
  code: string | null;
  preset: Preset;
}

/** Write the merged preset to project/preset (or remove it for plain factory). */
export function writeProjectPreset(root: string, preset: Preset): ApplyResult {
  const dir = join(root, ...TOKENS, "project");
  const file = join(dir, "preset");
  if (isFactory(preset)) {
    rmSync(file, { force: true });
    return { root, code: null, preset };
  }
  const code = encodePreset(preset);
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, `${code}\n`);
  return { root, code, preset };
}

export function readProjectPreset(root: string): Preset | null {
  const file = join(root, ...TOKENS, "project", "preset");
  return existsSync(file) ? parsePreset(readFileSync(file, "utf8")) : null;
}

interface ApplyOptions {
  preset?: string;
  only?: string;
  build?: boolean;
  format?: string;
}

export function registerApplyCommand(program: Command): void {
  program
    .command("apply")
    .description("Put a Sailor Studio preset on this project (its look, in one code)")
    .requiredOption("--preset <code>", "Preset code from Sailor Studio, or a design language id")
    .option("--only <group>", "Change only one group of knobs: theme | fonts")
    .option("--no-build", "Write the preset without rebuilding the tokens")
    .option("--format <type>", "Output format: json or table")
    .action(async (options: ApplyOptions) => {
      const only = options.only as ApplyOnly | undefined;
      if (only && !(only in ONLY)) {
        logger.error(`--only takes "theme" or "fonts", not "${options.only}".`);
        process.exit(ExitCode.INVALID_ARGS);
      }

      let next: Preset;
      try {
        next = parsePreset(options.preset ?? "");
      } catch (error) {
        logger.error(error instanceof PresetCodeError ? error.message : String(error));
        process.exit(ExitCode.INVALID_ARGS);
      }

      const root = findProjectRoot();
      if (!root) {
        logger.error(
          "Run this inside a Sailor project (no packages/design/tokens found above here).",
        );
        process.exit(ExitCode.NOT_FOUND);
      }
      if (existsSync(join(root, ...TOKENS, "project", "brand.json"))) {
        logger.error(
          "packages/design/tokens/project/brand.json is hand-authored and takes precedence over any preset. Remove it to use presets.",
        );
        process.exit(ExitCode.CONFLICT);
      }

      const result = writeProjectPreset(root, mergePreset(readProjectPreset(root), next, only));

      if (options.build !== false) {
        const build = await delegate({
          command: "pnpm",
          args: ["--filter", "@nebutra/tokens", "build"],
          cwd: root,
          label: "Rebuilding the tokens",
        });
        if (build.exitCode !== 0) {
          logger.error(build.stderr || "The tokens build failed.");
          process.exit(ExitCode.ERROR);
        }
      }

      if (options.format === "json") {
        console.log(JSON.stringify({ code: result.code, preset: result.preset }, null, 2));
        return;
      }
      logger.success(
        result.code
          ? `Applied preset ${result.code} (base: ${result.preset.base}).`
          : "Back to factory: the House tokens, unchanged.",
      );
    });
}
