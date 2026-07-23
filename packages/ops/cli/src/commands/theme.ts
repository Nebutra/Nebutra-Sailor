import { DEFAULT_LANGUAGE, getLanguageById, LANGUAGE_REGISTRY } from "@nebutra/theme/languages";
import type { Command } from "commander";
import { ExitCode } from "../utils/exit-codes";
import { logger } from "../utils/logger";

type OutputFormat = string | undefined;

function resolveFormat(commandOrOptions: {
  format?: string;
  opts?: () => { format?: string };
  optsWithGlobals?: () => { format?: string };
}): OutputFormat {
  const local = commandOrOptions.opts ? commandOrOptions.opts() : commandOrOptions;
  const global = commandOrOptions.optsWithGlobals
    ? commandOrOptions.optsWithGlobals()
    : commandOrOptions;
  return local.format ?? global.format ?? readFormatArg();
}

function readFormatArg(): OutputFormat {
  const equalsArg = process.argv.find((arg) => arg.startsWith("--format="));
  if (equalsArg) return equalsArg.slice("--format=".length);
  const index = process.argv.indexOf("--format");
  if (index >= 0) return process.argv[index + 1];
  return undefined;
}

/** Design languages (Brand Package global swap). */
export function formatLanguageList(format: OutputFormat = "table"): string {
  const languages = LANGUAGE_REGISTRY.languages;

  if (format === "json") {
    return JSON.stringify(
      {
        version: LANGUAGE_REGISTRY.version,
        defaultLanguage: LANGUAGE_REGISTRY.defaultLanguage,
        count: languages.length,
        languages,
      },
      null,
      2,
    );
  }

  const lines = [
    `Nebutra design languages (${languages.length}) — global product chrome swap`,
    `Default: ${DEFAULT_LANGUAGE} (factory tokens; no skin)`,
    `Contract: roles.action → CTA; roles.brand → brand-mark; free elev/radii/zones`,
    "",
    ...languages.map(
      (lang) =>
        `${lang.id.padEnd(10)} ${lang.darkDefault ? "dark " : "light"}  ${(lang.proves[0] ?? "").slice(0, 48)}  ${lang.description.slice(0, 56)}`,
    ),
  ];
  return lines.join("\n");
}

/** @deprecated Alias — moods catalog removed */
export function formatThemeList(format: OutputFormat = "table"): string {
  return formatLanguageList(format);
}

export function formatLanguageInspect(
  id: string,
  format: OutputFormat = "table",
): string | undefined {
  const lang = getLanguageById(id);
  if (!lang) return undefined;

  if (format === "json") {
    return JSON.stringify(lang, null, 2);
  }

  return [
    `${lang.name} (${lang.id}) — design language`,
    `Description: ${lang.description}`,
    `Dark default: ${lang.darkDefault}`,
    `Brand JSON: ${lang.brandPath ?? "(factory — none)"}`,
    `Skin CSS: ${lang.skinPath ?? "(factory — none)"}`,
    `Install: ${lang.install.command}`,
    `CSS import: ${lang.install.cssImport ?? "(clear data-brand)"}`,
    `Proves: ${lang.proves.join("; ")}`,
  ].join("\n");
}

export function formatThemeInspect(id: string, format: OutputFormat = "table"): string | undefined {
  return formatLanguageInspect(id, format);
}

export function registerThemeCommand(program: Command): void {
  const theme = program
    .command("theme")
    .description("Design languages (Brand Package global product chrome swap)");

  theme
    .command("list")
    .description("List design languages")
    .option("--format <type>", "Output format: json or table")
    .action((options) => {
      console.log(formatLanguageList(resolveFormat(options)));
    });

  theme
    .command("inspect <id>")
    .description("Show a design language by id")
    .option("--format <type>", "Output format: json or table")
    .action((id, options) => {
      const output = formatLanguageInspect(id, resolveFormat(options));
      if (!output) {
        logger.error(`Design language '${id}' not found. Run: nebutra theme list`);
        process.exit(ExitCode.NOT_FOUND);
      }
      console.log(output);
    });
}
