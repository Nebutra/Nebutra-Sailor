import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import {
  type Preset,
  PresetCodeError,
  presetArgument,
  presetJsonSchema,
  readPresetInput,
  studioReviewUrl,
} from "@nebutra/tokens/preset";
import type { Command } from "commander";
import { resolveAccessToken } from "../utils/credentials-store";
import { ExitCode } from "../utils/exit-codes";
import { logger } from "../utils/logger";

/**
 * `nebutra studio` — Sailor Studio for an agent. The loop it exists for:
 *
 *   1. the agent writes a preset (JSON, see `nebutra studio schema`)
 *   2. `nebutra studio preview` validates it and prints the Studio link;
 *      the agent asks the person to look. Only the person saves a look to
 *      their account, from Studio; an agent reads saved looks, never writes them
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

/** The gateway the account's presets live behind. */
const apiBase = () => (process.env.NEBUTRA_API_URL ?? getBrandOrigin("api")).replace(/\/+$/, "");

export interface SavedPreset {
  id: string;
  name: string;
  code: string;
  source: string;
  updatedAt: string;
}

/** The logged-in token, or null — sync is a bonus, never a requirement. */
async function accountToken(): Promise<string | null> {
  const resolved = await resolveAccessToken();
  return resolved && !resolved.expired ? resolved.token : null;
}

async function accountFetch(path: string, token: string, init: RequestInit = {}) {
  return fetch(`${apiBase()}/api/v1/studio${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });
}

export async function listAccountPresets(): Promise<SavedPreset[] | null> {
  const token = await accountToken();
  if (!token) return null;
  const res = await accountFetch("/presets", token);
  if (!res.ok) throw new Error(`The gateway answered ${res.status}.`);
  return ((await res.json()) as { presets: SavedPreset[] }).presets;
}

export interface StudioPreview {
  code: string;
  preset: Preset;
  reviewUrl: string;
  apply: string;
  create: string;
}

export function previewOf(preset: Preset): StudioPreview {
  const code = presetArgument(preset);
  return {
    code,
    preset,
    reviewUrl: studioReviewUrl(preset),
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
    .option("--json", "Machine-readable output")
    .action((input: string, options: { open?: boolean; json?: boolean }) => {
      let preview: StudioPreview;
      try {
        preview = previewOf(readPresetArgument(input));
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
    .command("list")
    .description("The looks you saved in Studio (nebutra login), newest first")
    .option("--json", "Machine-readable output")
    .action(async (options: { json?: boolean }) => {
      let presets: SavedPreset[] | null;
      try {
        presets = await listAccountPresets();
      } catch (error) {
        logger.error(String(error instanceof Error ? error.message : error));
        process.exit(ExitCode.ERROR);
      }
      if (presets === null) {
        logger.error("Not logged in. Run `nebutra login` to sync presets with Studio.");
        process.exit(ExitCode.PERMISSION_DENIED);
      }
      if (options.json) {
        console.log(JSON.stringify({ presets }, null, 2));
        return;
      }
      if (presets.length === 0) {
        console.log("No saved looks yet. Save one in Sailor Studio.");
        return;
      }
      for (const p of presets) {
        console.log(`  ${p.code.padEnd(12)} ${p.name}`);
      }
    });

  studio
    .command("pull [preset]")
    .description(
      "Put a preset (code, JSON, file or Studio link) on this project; --latest takes your newest saved one",
    )
    .option("--latest", "Use the newest preset saved to your account")
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
