/**
 * CLI Command Metadata
 *
 * Describes all commands available in the Nebutra governance CLI.
 * Used both for generating documentation and providing structured help.
 *
 * This is the single source of truth for CLI command documentation.
 */

export interface CommandArgument {
  name: string;
  description: string;
  required: boolean;
  variadic?: boolean;
}

export interface CommandOption {
  flags: string;
  description: string;
  default?: string | boolean;
}

export interface CommandExample {
  command: string;
  description: string;
}

export interface CommandMeta {
  name: string;
  description: string;
  usage?: string;
  arguments?: CommandArgument[];
  options?: CommandOption[];
  examples?: CommandExample[];
  subcommands?: CommandMeta[];
}

/**
 * Nebutra CLI - Governance and Platform Operations
 */
export const nebultraCommand: CommandMeta = {
  name: "nebutra",
  description: "Nebutra — the CLI for Sailor projects: status, dev, db, and codegen",
  usage: "nebutra [command] [options]",
  options: [
    {
      flags: "--format <type>",
      description: "Output format: json, table, plain",
    },
    {
      flags: "--yes, --no-interactive",
      description: "Skip all interactive prompts (Agent mode)",
    },
    {
      flags: "--no-color",
      description: "Disable colored output",
    },
    {
      flags: "--verbose",
      description: "Enable verbose output",
    },
    {
      flags: "--quiet",
      description: "Suppress non-essential output",
    },
  ],
  subcommands: [
    {
      name: "init",
      description: "Initialize a Nebutra project and create nebutra.config.json",
      usage: "nebutra init [options]",
      options: [
        {
          flags: "--dry-run",
          description: "Preview changes without writing files (exits with code 10)",
        },
        {
          flags: "--yes",
          description: "Skip all interactive prompts (Agent mode)",
        },
        {
          flags: "--if-not-exists",
          description: "Skip initialization if nebutra.config.json already exists",
        },
      ],
      arguments: [],
      examples: [
        {
          command: "nebutra init",
          description: "Initialize Nebutra configuration in the current directory",
        },
        {
          command: "nebutra init --dry-run",
          description: "Preview initialization changes without writing files",
        },
        {
          command: "nebutra init --yes --if-not-exists",
          description: "Initialize without prompts, skip if already configured",
        },
      ],
    },
    {
      name: "mcp",
      description: "Start the Nebutra MCP server for AI agents and editors",
      usage: "nebutra mcp [options]",
      arguments: [],
      options: [
        {
          flags: "--stdio",
          description: "Use stdio transport for communication (default: enabled)",
          default: true,
        },
        {
          flags: "--verbose",
          description: "Enable verbose logging for MCP server",
        },
      ],
      examples: [
        {
          command: "nebutra mcp",
          description: "Start the MCP server for AI-powered project context integration",
        },
        {
          command: "nebutra mcp --verbose",
          description: "Start the MCP server with detailed logging output",
        },
      ],
    },
    {
      name: "schema",
      description: "Show command schema and argument documentation (Agent-friendly JSON output)",
      usage: "nebutra schema [command] [options]",
      arguments: [
        {
          name: "command",
          description: "Command name to show schema for (e.g., init, dev, db)",
          required: false,
        },
      ],
      options: [
        {
          flags: "--all",
          description: "Show full schema for all commands as JSON",
          default: false,
        },
        {
          flags: "--list",
          description: "List all available command names",
          default: false,
        },
        {
          flags: "--exit-codes",
          description: "Show exit codes reference",
          default: false,
        },
      ],
      examples: [
        {
          command: "nebutra schema --all",
          description: "Show complete JSON of all commands, args, options, value domains",
        },
        {
          command: "nebutra schema init",
          description: "Show schema for init command (arguments, options, defaults, examples)",
        },
        {
          command: "nebutra schema --list",
          description: "List just the command names (quick discovery)",
        },
        {
          command: "nebutra schema --exit-codes",
          description: "Show exit codes reference for all possible exit codes",
        },
      ],
    },
    {
      name: "brand",
      description: "Manage governed brand tokens, palettes, and visual system outputs",
      usage: "nebutra brand [subcommand]",
      examples: [
        {
          command: "nebutra brand palette --primary=#0047FF",
          description: "Generate a token-aligned blue palette",
        },
      ],
    },
    {
      name: "i18n",
      description: "Manage localization files and multilingual product copy",
      usage: "nebutra i18n [subcommand]",
    },
    {
      name: "infra",
      description: "Manage local infrastructure services for Nebutra development",
      usage: "nebutra infra [subcommand]",
      examples: [
        {
          command: "nebutra infra up --lite",
          description: "Start lightweight local infrastructure",
        },
      ],
    },
    {
      name: "env",
      description: "Validate and manage environment variables across apps and packages",
      usage: "nebutra env [subcommand]",
    },
    {
      name: "license",
      description: "Manage Nebutra Sailor commercial license activation and status",
      usage: "nebutra license [subcommand]",
      arguments: [],
      options: [],
      subcommands: [
        {
          name: "activate",
          description: "Activate a commercial license key for local development",
          usage: "nebutra license activate <key>",
          arguments: [
            {
              name: "key",
              description: "Your Nebutra Sailor commercial license key",
              required: true,
            },
          ],
          options: [
            {
              flags: "--quiet",
              description: "Suppress output",
            },
          ],
          examples: [
            {
              command: "nebutra license activate liz_1234567890",
              description: "Activate your license key globally",
            },
          ],
        },
        {
          name: "status",
          description: "Check the locally configured license status",
          usage: "nebutra license status",
          arguments: [],
          options: [
            {
              flags: "--quiet",
              description: "Suppress output",
            },
          ],
          examples: [
            {
              command: "nebutra license status",
              description: "Check if you have an active license",
            },
          ],
        },
      ],
    },
    {
      name: "ai",
      description: "Configure AI providers, gateway routing, and agent-ready defaults",
      usage: "nebutra ai [subcommand]",
    },
    {
      name: "db",
      description: "Manage database schema, migrations, seeds, and generated clients",
      usage: "nebutra db [subcommand]",
    },
    {
      name: "generate",
      description: "Generate apps, modules, API surfaces, and typed project artifacts",
      usage: "nebutra generate [type] [name]",
    },
    {
      name: "dev",
      description: "Start development workflows for selected Nebutra apps or presets",
      usage: "nebutra dev [options]",
    },
    {
      name: "build",
      description: "Run build workflows through the Nebutra CLI",
      usage: "nebutra build [options]",
    },
    {
      name: "lint",
      description: "Run lint workflows through the Nebutra CLI",
      usage: "nebutra lint [options]",
    },
    {
      name: "typecheck",
      description: "Run TypeScript checks through the Nebutra CLI",
      usage: "nebutra typecheck [options]",
    },
    {
      name: "test",
      description: "Run unit, architecture, and E2E verification workflows",
      usage: "nebutra test [scope]",
    },
    {
      name: "e2e",
      description: "Run browser end-to-end verification suites",
      usage: "nebutra e2e [suite]",
    },
    {
      name: "theme",
      description: "Inspect registry-backed Nebutra themes and governance metadata",
      usage: "nebutra theme [subcommand]",
    },
    {
      name: "ui",
      description: "Search, inspect, validate, and plan migrations for @nebutra/ui components",
      usage: "nebutra ui [subcommand]",
    },
    {
      name: "services",
      description: "Inspect and manage microservice health, logs, scaling, and rollouts",
      usage: "nebutra services [subcommand]",
    },
    {
      name: "secrets",
      description: "Manage encrypted tenant and platform secrets",
      usage: "nebutra secrets [subcommand]",
    },
    {
      name: "completions",
      description: "Generate shell completions for the current Nebutra command surface",
      usage: "nebutra completions [shell]",
      arguments: [
        {
          name: "shell",
          description: "Shell to generate completions for: bash, zsh, fish, or install",
          required: false,
        },
      ],
    },
    {
      name: "logout",
      description: "Clear local Nebutra CLI session state",
      usage: "nebutra logout",
    },
    {
      name: "upgrade",
      description: "Upgrade local Nebutra CLI tooling",
      usage: "nebutra upgrade",
    },
    {
      name: "link",
      description: "Link a local project to Nebutra platform metadata",
      usage: "nebutra link",
    },
    {
      name: "unlink",
      description: "Unlink local Nebutra project metadata",
      usage: "nebutra unlink",
    },
    {
      name: "status",
      description:
        "Show capability readiness — live, local-fallback, or missing-key, per environment",
      usage: "nebutra status [options]",
      arguments: [],
      options: [
        {
          flags: "--json",
          description: "Emit machine-readable JSON",
        },
      ],
      examples: [
        {
          command: "nebutra status",
          description: "Show a readiness table for every capability in nebutra.config.json",
        },
        {
          command: "nebutra status --json",
          description: "Emit { stack, locale, capabilities } as JSON for agents",
        },
      ],
    },
    {
      name: "doctor",
      description: "Check local project setup and common Nebutra configuration issues",
      usage: "nebutra doctor",
    },
  ],
};

/**
 * create-sailor CLI - Project Scaffolding Tool
 */
export const createSailorCommand: CommandMeta = {
  name: "create-sailor",
  description: "Topology-first project generator for governed Nebutra Sailor SaaS scaffolds",
  usage: "create-sailor [dir]",
  arguments: [
    {
      name: "dir",
      description:
        "Target directory to initialize the project in (optional, will prompt if not provided)",
      required: false,
    },
  ],
  options: [],
  examples: [
    {
      command: "create-sailor my-project",
      description: "Create a new Nebutra-Sailor project in the my-project directory",
    },
    {
      command: "create-sailor",
      description: "Create a new project with interactive prompts for all configuration options",
    },
    {
      command: "npm create sailor my-startup",
      description: "Alternative syntax: use npm create to run the create-sailor CLI",
    },
  ],
};

/**
 * nebutra-mcp CLI - MCP Server for AI Integration
 */
export const nebutraMcpCommand: CommandMeta = {
  name: "nebutra-mcp",
  description:
    "Model Context Protocol (MCP) server that exposes Nebutra project structure and tools to AI agents and editors",
  usage: "nebutra-mcp",
  arguments: [],
  options: [],
  examples: [
    {
      command: "nebutra mcp",
      description: "Start the MCP server via the nebutra CLI",
    },
  ],
};

/**
 * All CLI commands
 */
export const allCommands: CommandMeta[] = [nebultraCommand, createSailorCommand, nebutraMcpCommand];
