import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import {
  type Preset,
  PresetCodeError,
  presetArgument,
  presetJsonSchema,
  readPresetInput,
  studioReviewUrl,
} from "@nebutra/tokens/preset";
import type { Command } from "commander";
import { ExitCode } from "../utils/exit-codes";
import { logger } from "../utils/logger";

/**
 * `nebutra studio` — Sailor Studio for an agent. The loop it exists for:
 *
 *   1. the agent writes a preset (JSON, see `nebutra studio schema`)
 *   2. `nebutra studio preview` validates it and prints the Studio link;
 *      the agent asks the person to look
 *   3. once they are happy, `nebutra studio pull` puts it on this project
 *      (or `npx create-sailor@latest my-app --preset <code>` starts one)
 *
 * Every subcommand takes --json so an agent reads fields, not prose.
 */

/** A preset from an argument: a file path, JSON, a code, a base id or a Studio URL. */
export function readPresetArgument(input: string): Preset {
  const value = input.trim();
  const text =
    !value.startsWith("{") && !/^https?:/.test(value) && existsSync(value)
      ? readFileSync(value, "utf8")
      : value;
  return readPresetInput(text);
}

function openInBrowser(url: string): void {
  const command =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  spawn(command, [url], { stdio: "ignore", detached: true, shell: process.platform === "win32" })
    .on("error", () => logger.warn(`Could not open a browser. Open ${url} yourself.`))
    .unref();
}

function fail(error: unknown): never {
  logger.error(error instanceof PresetCodeError ? error.message : String(error));
  process.exit(ExitCode.INVALID_ARGS);
}

export interface StudioPreview {
  code: string;
  preset: Preset;
  reviewUrl: string;
  apply: string;
  create: string;
}

export function previewOf(preset: Preset, from = "agent"): StudioPreview {
  const code = presetArgument(preset);
  return {
    code,
    preset,
    reviewUrl: studioReviewUrl(preset, from),
    apply: `nebutra studio pull ${code}`,
    create: `npx create-sailor@latest my-app --preset ${code}`,
  };
}

export function registerStudioCommand(program: Command): void {
  const studio = program
    .command("studio")
    .description("Sailor Studio for agents: write a preset, review it in the browser, pull it");

  studio
    .command("schema")
    .description("Print the preset JSON Schema (what a preset may contain)")
    .action(() => {
      console.log(JSON.stringify(presetJsonSchema(), null, 2));
    });

  studio
    .command("preview <preset>")
    .description("Validate a preset and print the Sailor Studio link to review it")
    .option("--open", "Open the link in the browser")
    .option("--from <agent>", "Who proposed it, shown on the Studio banner", "agent")
    .option("--json", "Machine-readable output")
    .action((input: string, options: { open?: boolean; from: string; json?: boolean }) => {
      let preview: StudioPreview;
      try {
        preview = previewOf(readPresetArgument(input), options.from);
      } catch (error) {
        fail(error);
      }
      if (options.open) openInBrowser(preview.reviewUrl);
      if (options.json) {
        console.log(JSON.stringify(preview, null, 2));
        return;
      }
      logger.success(`Preset ${preview.code} is valid.`);
      console.log(`\n  Review it:   ${preview.reviewUrl}`);
      console.log(`  Apply here:  ${preview.apply}`);
      console.log(`  New project: ${preview.create}\n`);
    });

  studio
    .command("pull <preset>")
    .description("Put a preset (code, JSON, file or Studio link) on this project")
    .option("--only <group>", "Change only one group of knobs: theme | fonts")
    .option("--no-build", "Write the preset without rebuilding the tokens")
    .option("--json", "Machine-readable output")
    .action(async (input: string, options: { only?: string; build?: boolean; json?: boolean }) => {
      let code: string;
      try {
        code = presetArgument(readPresetArgument(input));
      } catch (error) {
        fail(error);
      }
      // One apply path: the same command Studio hands a person.
      const args = ["apply", "--preset", code];
      if (options.only) args.push("--only", options.only);
      if (options.build === false) args.push("--no-build");
      if (options.json) args.push("--format", "json");
      await program.parseAsync(args, { from: "user" });
    });
}
