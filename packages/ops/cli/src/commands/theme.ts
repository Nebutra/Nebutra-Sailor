import { getThemeById, THEME_REGISTRY } from "@nebutra/theme/registry";
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

function toThemeSummary(theme: (typeof THEME_REGISTRY.themes)[number]) {
  return {
    id: theme.id,
    name: theme.name,
    category: theme.category,
    mood: theme.mood,
    tokenPath: theme.tokenPath,
    installCommand: theme.install.command,
    registryUrl: theme.install.registryUrl,
    wcag: theme.governance.wcag,
    visualSuites: theme.governance.visualSuites,
  };
}

export function formatThemeList(format: OutputFormat = "table"): string {
  const themes = THEME_REGISTRY.themes.map(toThemeSummary);

  if (format === "json") {
    return JSON.stringify(
      {
        version: THEME_REGISTRY.version,
        defaultTheme: THEME_REGISTRY.defaultTheme,
        count: themes.length,
        themes,
      },
      null,
      2,
    );
  }

  const lines = [
    `Nebutra themes (${themes.length})`,
    `Default: ${THEME_REGISTRY.defaultTheme}`,
    "",
    ...themes.map(
      (theme) =>
        `${theme.id.padEnd(12)} ${theme.category.padEnd(14)} ${theme.tokenPath.padEnd(34)} ${theme.mood}`,
    ),
  ];

  return lines.join("\n");
}

export function formatThemeInspect(id: string, format: OutputFormat = "table"): string | undefined {
  const theme = getThemeById(id);
  if (!theme) return undefined;

  if (format === "json") {
    return JSON.stringify(theme, null, 2);
  }

  return [
    `${theme.name} (${theme.id})`,
    `Category: ${theme.category}`,
    `Mood: ${theme.mood}`,
    `Token path: ${theme.tokenPath}`,
    `Install: ${theme.install.command}`,
    `Registry: ${theme.install.registryUrl}`,
    `WCAG: ${theme.governance.wcag}`,
    `Visual suites: ${theme.governance.visualSuites.join(", ")}`,
    `Required tokens: ${theme.governance.requiredTokens.join(", ")}`,
  ].join("\n");
}

export function registerThemeCommand(program: Command): void {
  const theme = program
    .command("theme")
    .description("Inspect registry-backed Nebutra themes and governance metadata");

  theme
    .command("list")
    .description("List built-in themes from the shared theme registry")
    .option("--format <type>", "Output format: json or table")
    .action((options) => {
      console.log(formatThemeList(resolveFormat(options)));
    });

  theme
    .command("inspect <id>")
    .description("Show governance metadata for one theme")
    .option("--format <type>", "Output format: json or table")
    .action((id, options) => {
      const output = formatThemeInspect(id, resolveFormat(options));
      if (!output) {
        logger.error(`Theme '${id}' was not found in the Nebutra theme registry.`);
        process.exit(ExitCode.NOT_FOUND);
      }
      console.log(output);
    });
}
