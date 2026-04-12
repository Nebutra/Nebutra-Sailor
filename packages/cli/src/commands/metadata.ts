/**
 * CLI Command Metadata
 *
 * Describes all commands available in the Nebutra CLI ecosystem.
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
 * Nebutra CLI - Package & Component Manager
 */
export const nebultraCommand: CommandMeta = {
  name: "nebutra",
  description: "Nebutra Package & Component Manager",
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
      name: "add",
      description: "Add a component or feature to your project",
      usage: "nebutra add [components...] [options]",
      arguments: [
        {
          name: "components",
          description: "Component names to add from the HeroUI component library",
          required: false,
          variadic: true,
        },
      ],
      options: [
        {
          flags: "--21st <id>",
          description: "Fetch and install a component from 21st.dev registry",
        },
        {
          flags: "--v0 <url>",
          description: "Fetch and install a component from v0.dev by URL",
        },
        {
          flags: "--dry-run",
          description: "Preview what would be installed without making changes (exit code 10)",
        },
        {
          flags: "--yes",
          description: "Skip all interactive prompts and use defaults (Agent mode)",
        },
        {
          flags: "--if-not-exists",
          description: "Skip installation if component already exists",
        },
      ],
      examples: [
        {
          command: "nebutra add button input card",
          description: "Add HeroUI components (button, input, card) to your project",
        },
        {
          command: "nebutra add --21st button-01",
          description: "Add a component from 21st.dev (shadcn-style registry)",
        },
        {
          command: 'nebutra add --v0 "https://v0.dev/r/..." --dry-run',
          description: "Preview adding a component from v0.dev without making changes",
        },
        {
          command: "nebutra add button --yes --if-not-exists",
          description: "Add button component without prompts, skip if already exists",
        },
      ],
    },
    {
      name: "create",
      description: "Scaffold a new Nebutra-Sailor project",
      usage: "nebutra create [dir] [options]",
      arguments: [
        {
          name: "dir",
          description:
            "Target directory for the new project (optional, will prompt if not provided)",
          required: false,
        },
      ],
      options: [
        {
          flags: "--dry-run",
          description: "Preview project scaffolding without creating files (exit code 10)",
        },
        {
          flags: "--yes",
          description: "Skip all interactive prompts (Agent mode)",
        },
      ],
      examples: [
        {
          command: "nebutra create my-saas-app",
          description:
            "Create a new Nebutra-Sailor project in the my-saas-app directory with interactive prompts",
        },
        {
          command: "nebutra create",
          description: "Create a new project with prompts for directory and configuration",
        },
        {
          command: "nebutra create my-app --dry-run",
          description: "Preview project scaffolding without creating files",
        },
      ],
    },
    {
      name: "mcp",
      description: "Start the Nebutra MCP server for Cursor/Windsurf integration",
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
          description: "Command name to show schema for (e.g., init, add, create)",
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
          command: "nebutra schema add",
          description: "Show schema for add command with enum values",
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
      name: "license",
      description: "Manage your Nebutra-Sailor commercial license",
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
              description: "Your Nebutra-Sailor commercial license key",
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
  ],
};

/**
 * create-sailor CLI - Project Scaffolding Tool
 */
export const createSailorCommand: CommandMeta = {
  name: "create-sailor",
  description: "CLI to bootstrap Nebutra-Sailor scaffolding and create new projects",
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
    "Model Context Protocol (MCP) server that exposes Nebutra project structure and tools to Cursor/Windsurf",
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
