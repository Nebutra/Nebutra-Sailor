import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";

// All known subcommands and their flags
const KNOWN_COMMANDS = [
  "init",
  "add",
  "create",
  "mcp",
  "completions",
  "doctor",
  "schema",
  "db",
  "brand",
  "i18n",
  "infra",
  "env",
  "generate",
  "preset",
  "dev",
  "build",
  "lint",
  "typecheck",
  "test",
  "ai",
  "auth",
  "billing",
  "stats",
  // Platform & ecosystem
  "admin",
  "community",
  "growth",
  "ecosystem",
  "services",
  "search",
  "secrets",
];

const KNOWN_FLAGS = [
  "--help",
  "--version",
  "--21st",
  "--v0",
  "--stdio",
  "--format",
  "--yes",
  "--no-interactive",
  "--no-color",
  "--verbose",
  "--quiet",
  "--dry-run",
  "--if-not-exists",
];

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
  elif [[ "\${prev}" == "add" ]]; then
    # add command takes component names
    COMPREPLY=( $(compgen -W "--21st --v0" -- \${cur}) )
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
    "init:Initialize a Nebutra project and create nebutra.config.json"
    "add:Add a component or feature to your project"
    "create:Scaffold a new Nebutra-Sailor project"
    "mcp:Start the Nebutra MCP server for Cursor/Windsurf"
    "completions:Generate shell completions"
    "doctor:Check your Nebutra project setup"
    "schema:Show command schema and argument documentation (for Agents)"
  )

  local -a global_flags=(
    "--help[Show help message]"
    "--version[Show version]"
  )

  local -a add_flags=(
    "--21st[Fetch and install a component from 21st.dev]:component ID"
    "--v0[Fetch and install a component from v0.dev]:URL"
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
      add)
        _arguments "*:component:($global_flags $add_flags)"
        ;;
      completions)
        _values "shell type" bash zsh fish install
        ;;
      mcp)
        _arguments "*:options:($global_flags $mcp_flags)"
        ;;
      schema)
        _arguments "*:options:($global_flags $schema_flags)"
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

complete -c nebutra -f -n "__fish_seen_subcommand_from; and not __fish_seen_subcommand_from init add create mcp completions doctor" -d "Nebutra Package Manager"

# Subcommands
complete -c nebutra -n "__fish_use_subcommand_only" -f -a "init" -d "Initialize a Nebutra project"
complete -c nebutra -n "__fish_use_subcommand_only" -f -a "add" -d "Add a component or feature"
complete -c nebutra -n "__fish_use_subcommand_only" -f -a "create" -d "Scaffold a new Nebutra-Sailor project"
complete -c nebutra -n "__fish_use_subcommand_only" -f -a "mcp" -d "Start the Nebutra MCP server"
complete -c nebutra -n "__fish_use_subcommand_only" -f -a "completions" -d "Generate shell completions"
complete -c nebutra -n "__fish_use_subcommand_only" -f -a "doctor" -d "Check your Nebutra project setup"
complete -c nebutra -n "__fish_use_subcommand_only" -f -a "schema" -d "Show command schema (for Agents)"

# Flags
complete -c nebutra -f -a "--help" -d "Show help message"
complete -c nebutra -f -a "--version" -d "Show version"

# add command flags
complete -c nebutra -n "__fish_seen_subcommand_from add" -f -a "--21st" -d "Fetch and install a component from 21st.dev"
complete -c nebutra -n "__fish_seen_subcommand_from add" -f -a "--v0" -d "Fetch and install a component from v0.dev"

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
    process.exit(1);
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
      process.exit(0);
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

    process.exit(1);
  }
}

export function registerCompletionsCommand(program: any) {
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
