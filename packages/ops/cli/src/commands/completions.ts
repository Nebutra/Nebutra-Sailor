import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import * as p from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { ExitCode } from "../utils/exit-codes";
import { nebultraCommand } from "./metadata";

const KNOWN_COMMANDS = (nebultraCommand.subcommands ?? []).map((command) => command.name);

const COMMAND_DESCRIPTIONS: Record<string, string> = {
  init: "Initialize a Nebutra project and create nebutra.config.json",
  mcp: "Start the Nebutra MCP server for AI agents and editors",
  completions: "Generate shell completions",
  doctor: "Check your Nebutra project setup",
  schema: "Show command schema and argument documentation",
  brand: "Manage governed brand tokens and palettes",
  i18n: "Manage localization files and multilingual product copy",
  infra: "Manage local infrastructure services",
  env: "Validate and manage environment variables",
  license: "Manage Nebutra Sailor commercial license activation and status",
  db: "Database migration and management",
  generate: "Scaffold apps, modules, and code",
  dev: "Start development server",
  build: "Run build workflows",
  lint: "Run lint workflows",
  typecheck: "Run TypeScript checks",
  test: "Run unit and E2E tests",
  e2e: "Run browser E2E suites",
  theme: "Theme registry and governance metadata",
  ai: "AI provider and gateway routing configuration",
  services: "Microservice management",
  secrets: "Encrypted secrets management",
  logout: "Clear local session state",
  upgrade: "Upgrade local CLI tooling",
  link: "Link local project metadata",
  unlink: "Unlink local project metadata",
  status: "Show capability readiness (live/local-fallback/missing-key)",
};

const KNOWN_FLAGS = [
  "--help",
  "--version",
  "--stdio",
  "--format",
  "--yes",
  "--no-interactive",
  "--no-color",
  "--verbose",
  "--quiet",
  "--dry-run",
  "--if-not-exists",
  "--json",
];

const fishSubcommands = KNOWN_COMMANDS.map(
  (command) =>
    `complete -c nebutra -n "__fish_use_subcommand_only" -f -a "${command}" -d "${COMMAND_DESCRIPTIONS[command]}"`,
).join("\n");

/**
 * Generate bash completion script.
 * Provides basic completion for commands and flags.
 */
function generateBashCompletion(): string {
  return `#!/usr/bin/env bash

_nebutra_completions() {
  local cur prev opts cmd
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  # Subcommands
  local subcommands="${KNOWN_COMMANDS.join(" ")}"

  # Flags
  local flags="${KNOWN_FLAGS.join(" ")}"

  if [[ \${cur} == -* ]]; then
    # Complete flags
    COMPREPLY=( $(compgen -W "\${flags}" -- \${cur}) )
  elif [[ \${COMP_CWORD} -eq 1 ]]; then
    # Complete subcommands at position 1
    COMPREPLY=( $(compgen -W "\${subcommands}" -- \${cur}) )
  elif [[ "\${prev}" == "completions" ]]; then
    # completions command takes shell type
    COMPREPLY=( $(compgen -W "bash zsh fish install" -- \${cur}) )
  fi

  return 0
}

complete -o bashdefault -o default -o nospace -F _nebutra_completions nebutra
`;
}

/**
 * Generate zsh completion script.
 * Provides command and flag completion for zsh.
 */
function generateZshCompletion(): string {
  return `#compdef nebutra

_nebutra() {
  local -a commands=(
    ${KNOWN_COMMANDS.map((command) => `"${command}:${COMMAND_DESCRIPTIONS[command]}"`).join("\n    ")}
  )

  local -a global_flags=(
    "--help[Show help message]"
    "--version[Show version]"
  )

  local -a status_flags=(
    "--json[Emit machine-readable JSON]"
  )

  local -a mcp_flags=(
    "--stdio[Use stdio transport (default)]"
  )

  local -a schema_flags=(
    "--all[Show full schema for all commands]"
    "--list[List all available command names]"
    "--exit-codes[Show exit codes reference]"
  )

  if (( CURRENT == 2 )); then
    # Complete subcommand
    _describe "command" commands
  else
    case "\${words[2]}" in
      completions)
        _values "shell type" bash zsh fish install
        ;;
      mcp)
        _arguments "*:options:($global_flags $mcp_flags)"
        ;;
      schema)
        _arguments "*:options:($global_flags $schema_flags)"
        ;;
      status)
        _arguments "*:options:($global_flags $status_flags)"
        ;;
      *)
        _arguments "*:options:($global_flags)"
        ;;
    esac
  fi
}

_nebutra
`;
}

/**
 * Generate fish completion script.
 * Provides command and flag completion for fish shell.
 */
function generateFishCompletion(): string {
  return `# Fish shell completions for nebutra

complete -c nebutra -f -n "__fish_seen_subcommand_from; and not __fish_seen_subcommand_from ${KNOWN_COMMANDS.join(" ")}" -d "Nebutra governance CLI"

# Subcommands
${fishSubcommands}

# Flags
complete -c nebutra -f -a "--help" -d "Show help message"
complete -c nebutra -f -a "--version" -d "Show version"

# status command flags
complete -c nebutra -n "__fish_seen_subcommand_from status" -f -a "--json" -d "Emit machine-readable JSON"

# mcp command flags
complete -c nebutra -n "__fish_seen_subcommand_from mcp" -f -a "--stdio" -d "Use stdio transport (default)"

# completions command options
complete -c nebutra -n "__fish_seen_subcommand_from completions" -f -a "bash" -d "Generate bash completions"
complete -c nebutra -n "__fish_seen_subcommand_from completions" -f -a "zsh" -d "Generate zsh completions"
complete -c nebutra -n "__fish_seen_subcommand_from completions" -f -a "fish" -d "Generate fish completions"
complete -c nebutra -n "__fish_seen_subcommand_from completions" -f -a "install" -d "Auto-install completions to shell config"

# schema command flags
complete -c nebutra -n "__fish_seen_subcommand_from schema" -f -a "--all" -d "Show full schema for all commands"
complete -c nebutra -n "__fish_seen_subcommand_from schema" -f -a "--list" -d "List all available command names"
complete -c nebutra -n "__fish_seen_subcommand_from schema" -f -a "--exit-codes" -d "Show exit codes reference"
`;
}

/**
 * Print completion script to stdout.
 */
function printCompletion(shell: string): void {
  const completionMap: Record<string, () => string> = {
    bash: generateBashCompletion,
    zsh: generateZshCompletion,
    fish: generateFishCompletion,
  };

  const generator = completionMap[shell.toLowerCase()];
  if (!generator) {
    console.error(pc.red(`Error: Unknown shell '${shell}'. Supported: bash, zsh, fish`));
    process.exit(ExitCode.INVALID_ARGS);
  }

  console.log(generator());
}

/**
 * Auto-detect the user's shell and install completions.
 */
async function installCompletions(): Promise<void> {
  const shell = process.env.SHELL || "/bin/bash";
  const shellName = shell.split("/").pop() || "bash";

  p.intro(pc.bgCyan(pc.black(" nebutra completions install ")));

  const spinner = p.spinner();
  spinner.start(pc.cyan(`Detecting shell: ${shellName}...`));

  try {
    let configFile: string | null = null;
    let completionDir: string | null = null;
    let installCommand: string | null = null;

    if (shellName === "bash") {
      configFile = join(homedir(), ".bashrc");
      completionDir = join(homedir(), ".bash_completion.d");
      installCommand = "source ~/.bash_completion.d/nebutra";
    } else if (shellName === "zsh") {
      configFile = join(homedir(), ".zshrc");
      completionDir = join(homedir(), ".zsh/completions");
      installCommand = "fpath=(~/.zsh/completions $fpath)";
    } else if (shellName === "fish") {
      completionDir = join(homedir(), ".config/fish/completions");
      installCommand = "# Completions installed to ~/.config/fish/completions/nebutra.fish";
    } else {
      spinner.stop();
      p.log.warn(
        pc.yellow(
          `Warning: Unsupported shell '${shellName}'. Please install completions manually.`,
        ),
      );
      printCompletion("bash");
      p.outro(
        pc.cyan(
          "Run 'nebutra completions bash' (or zsh/fish) to generate completions for your shell.",
        ),
      );
      process.exit(ExitCode.SUCCESS);
    }

    // Ensure completion directory exists
    if (completionDir) {
      const fs = await import("node:fs");
      fs.mkdirSync(completionDir, { recursive: true });

      // Write completion file
      const completionFile = join(completionDir, shellName === "fish" ? "nebutra.fish" : "nebutra");
      const completion =
        shellName === "bash"
          ? generateBashCompletion()
          : shellName === "zsh"
            ? generateZshCompletion()
            : generateFishCompletion();

      writeFileSync(completionFile, completion);
      spinner.stop(pc.green(`Completion script installed to ${completionFile}`));
    }

    // Add sourcing to shell config if needed (except fish)
    if (configFile && installCommand && shellName !== "fish") {
      if (!existsSync(configFile) || !readFileSync(configFile, "utf8").includes("nebutra")) {
        const sourceCommand =
          shellName === "bash"
            ? "\n# nebutra completions\n[[ -f ~/.bash_completion.d/nebutra ]] && source ~/.bash_completion.d/nebutra"
            : "\n# nebutra completions\nfpath=(~/.zsh/completions $fpath)\nautoload -Uz compinit && compinit";

        appendFileSync(configFile, sourceCommand + "\n");
        p.log.info(pc.green(`Added nebutra completions to ${configFile}`));
      }
    }

    p.log.info(pc.cyan("Completions installed! Restart your shell or run:"));
    p.log.info(pc.dim(`  source "${shellName === "bash" ? "~/.bashrc" : "~/.zshrc"}"`));

    p.outro(pc.green("Installation complete!"));
  } catch (error: unknown) {
    spinner.stop();
    p.log.error(pc.red("Error installing completions. You can manually add them by running:"));
    p.log.info(pc.cyan(`  nebutra completions ${shellName} >> ~/.${shellName}rc`));

    if (error instanceof Error) {
      console.error(pc.dim(error.message));
    }

    process.exit(ExitCode.ERROR);
  }
}

export function registerCompletionsCommand(program: Command) {
  program
    .command("completions [shell]")
    .description("Generate or install shell completions")
    .action(async (shell: string | undefined) => {
      if (!shell || shell === "install") {
        await installCompletions();
      } else {
        printCompletion(shell);
      }
    });
}
