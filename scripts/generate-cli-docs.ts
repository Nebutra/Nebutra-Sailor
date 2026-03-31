#!/usr/bin/env node

/**
 * CLI Documentation Auto-Generator
 *
 * Generates comprehensive Markdown documentation from CLI command metadata.
 * Outputs a single reference document describing all Nebutra CLI commands.
 *
 * Usage:
 *   tsx scripts/generate-cli-docs.ts [--output PATH]
 *   node scripts/generate-cli-docs.ts [--output PATH]
 *
 * Default output: apps/design-docs/content/cli-reference.md
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Type definitions (inline to avoid import issues)
interface CommandArgument {
  name: string;
  description: string;
  required: boolean;
  variadic?: boolean;
}

interface CommandOption {
  flags: string;
  description: string;
  default?: string | boolean;
}

interface CommandExample {
  command: string;
  description: string;
}

interface CommandMeta {
  name: string;
  description: string;
  usage?: string;
  arguments?: CommandArgument[];
  options?: CommandOption[];
  examples?: CommandExample[];
  subcommands?: CommandMeta[];
}

// Command metadata (inline to avoid import issues)
const nebultraCommand: CommandMeta = {
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
  ],
};

const createSailorCommand: CommandMeta = {
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

const nebutraMcpCommand: CommandMeta = {
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

interface GeneratorOptions {
  output?: string;
}

/**
 * Parse CLI arguments
 */
function parseArgs(): GeneratorOptions {
  const args = process.argv.slice(2);
  const options: GeneratorOptions = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--output") {
      options.output = args[i + 1];
      i++;
    }
  }

  return options;
}

// All commands
const _allCommands: CommandMeta[] = [nebultraCommand, createSailorCommand, nebutraMcpCommand];

/**
 * Format command usage with proper escaping
 */
function _formatCommandUsage(usage: string | undefined): string {
  if (!usage) return "";
  return usage.replace(/</g, "`<").replace(/>/g, ">`");
}

/**
 * Generate a table of command arguments
 */
function generateArgumentsTable(args?: CommandArgument[]): string {
  if (!args || args.length === 0) return "";

  let table = "\n| Argument | Description | Required |\n";
  table += "|----------|-------------|----------|\n";

  for (const arg of args) {
    const variadicHint = arg.variadic ? " (variadic)" : "";
    const required = arg.required ? "Yes" : "No";
    table += `| \`${arg.name}\`${variadicHint} | ${arg.description} | ${required} |\n`;
  }

  return table;
}

/**
 * Generate a table of command options
 */
function generateOptionsTable(options?: CommandOption[]): string {
  if (!options || options.length === 0) return "";

  let table = "\n| Option | Description | Default |\n";
  table += "|--------|-------------|----------|\n";

  for (const opt of options) {
    const defaultValue =
      opt.default !== undefined
        ? typeof opt.default === "boolean"
          ? opt.default
            ? "enabled"
            : "disabled"
          : `\`${opt.default}\``
        : "—";
    table += `| \`${opt.flags}\` | ${opt.description} | ${defaultValue} |\n`;
  }

  return table;
}

/**
 * Generate examples section
 */
function generateExamples(command: CommandMeta): string {
  if (!command.examples || command.examples.length === 0) {
    return "";
  }

  let section = "\n**Examples:**\n\n";

  for (const example of command.examples) {
    section += `\`\`\`bash\n${example.command}\n\`\`\`\n`;
    section += `${example.description}\n\n`;
  }

  return section;
}

/**
 * Generate documentation for a single command
 */
function generateCommandDocs(command: CommandMeta, level: number = 2): string {
  const heading = "#".repeat(level);
  let doc = `${heading} \`${command.name}\`\n\n`;

  if (command.description) {
    doc += `${command.description}\n\n`;
  }

  if (command.usage) {
    doc += `**Usage:**\n\`\`\`bash\n${command.usage}\n\`\`\`\n\n`;
  }

  if (command.arguments && command.arguments.length > 0) {
    doc += `**Arguments:**\n`;
    doc += generateArgumentsTable(command.arguments);
  }

  if (command.options && command.options.length > 0) {
    doc += `**Options:**\n`;
    doc += generateOptionsTable(command.options);
  }

  doc += generateExamples(command);

  // Subcommands
  if (command.subcommands && command.subcommands.length > 0) {
    for (const subcmd of command.subcommands) {
      doc += generateCommandDocs(subcmd, level + 1);
    }
  }

  return doc;
}

/**
 * Generate the complete documentation
 */
function generateDocumentation(): string {
  let doc = `# Nebutra CLI Reference

> **Auto-generated from CLI source code** — Do not edit manually.
>
> Generated: ${new Date().toISOString()}

This reference documents all commands available in the Nebutra CLI ecosystem.

---

## Overview

The Nebutra CLI suite provides three main tools:

1. **\`nebutra\`** — Package & component manager, project initialization, and AI integration
2. **\`create-sailor\`** — Project scaffolding tool for bootstrapping new Nebutra-Sailor applications
3. **\`nebutra-mcp\`** — MCP server for Cursor/Windsurf AI integration

---

`;

  // Main nebutra command
  doc += generateCommandDocs(nebultraCommand, 2);

  // Divider
  doc += `---

`;

  // create-sailor command
  doc += generateCommandDocs(createSailorCommand, 2);

  // Divider
  doc += `---

`;

  // nebutra-mcp command
  doc += generateCommandDocs(nebutraMcpCommand, 2);

  // Footer
  doc += `---

## Getting Help

Each command supports \`--help\` to display inline documentation:

\`\`\`bash
nebutra --help
nebutra init --help
nebutra add --help
nebutra create --help
nebutra mcp --help
\`\`\`

## Installation

### Install globally via npm

\`\`\`bash
npm install -g @nebutra/cli
\`\`\`

### Install in a project

\`\`\`bash
pnpm install --save-dev @nebutra/cli
pnpm exec nebutra init
\`\`\`

### Use with create

\`\`\`bash
npm create sailor my-app
\`\`\`

---

## Common Workflows

### Initialize a new project

\`\`\`bash
nebutra init
\`\`\`

This creates a \`nebutra.config.json\` file in the current directory with sensible defaults.

### Add UI components

\`\`\`bash
# From HeroUI library
nebutra add button input card

# From 21st.dev (shadcn-style)
nebutra add --21st button-01

# From v0.dev
nebutra add --v0 "https://v0.dev/r/xxxxx"
\`\`\`

### Create a full-stack SaaS application

\`\`\`bash
nebutra create my-startup

# Then follow interactive prompts for:
# - Application type (SaaS, Full monorepo, E-Commerce, Web3)
# - ORM (Prisma, Drizzle, None)
# - Database (PostgreSQL, MySQL, SQLite, None)
# - Payment provider (Stripe, Lemon Squeezy, None)
# - AI provider (OpenAI, Anthropic, None)
# - Internationalization (i18n) support
\`\`\`

### Start the MCP server for AI integration

\`\`\`bash
nebutra mcp
\`\`\`

This starts a Model Context Protocol server that exposes your project structure to Cursor and Windsurf,
enabling AI assistants to understand your codebase instantly.

---

## Configuration

### nebutra.config.json

The \`nebutra init\` command creates a \`nebutra.config.json\` file:

\`\`\`json
{
  "$schema": "https://nebutra.com/schema.json",
  "componentsDirectory": "packages/ui/src/components",
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "packages/tokens/styles.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@nebutra/ui",
    "utils": "@nebutra/ui/utils"
  }
}
\`\`\`

This configuration tells the CLI where your components are located and how to integrate with Tailwind.

### create-sailor Interactive Prompts

When running \`create-sailor\` or \`nebutra create\`, you'll be prompted for:

- **Application Type**: SaaS, Full monorepo, E-Commerce, or Web3
- **ORM**: Prisma (recommended), Drizzle, or None
- **Database**: PostgreSQL, MySQL, SQLite, or None
- **Payment**: Stripe, Lemon Squeezy, or None
- **AI Provider**: OpenAI, Anthropic, or None
- **i18n Support**: Enable internationalization

You can also provide environment variables:
- \`DATABASE_URL\`
- \`CLERK_PUBLISHABLE_KEY\`
- \`CLERK_SECRET_KEY\`

---

## Troubleshooting

### Command not found

If \`nebutra\` or \`create-sailor\` cannot be found:

1. Ensure it's installed globally: \`npm install -g @nebutra/cli\`
2. Or run with \`pnpm exec nebutra\` in your project
3. Check your PATH: \`echo $PATH\`

### create-sailor fails to launch

If \`nebutra create\` cannot start \`create-sailor\`:

1. Ensure \`@nebutra/create-sailor\` is installed: \`npm install -g @nebutra/create-sailor\`
2. Or install locally: \`pnpm install --save-dev @nebutra/create-sailor\`

### MCP server fails to start

If \`nebutra mcp\` cannot start:

1. Ensure \`@nebutra/mcp\` is installed: \`npm install -g @nebutra/mcp\`
2. Check that Node.js version is >= 22.0.0: \`node --version\`

---

## Environment Variables

The CLI respects these environment variables:

| Variable | Purpose |
|----------|---------|
| \`NODE_ENV\` | Set to \`development\` for verbose logging |
| \`EDITOR\` | Editor to use for interactive prompts |

---

## Advanced Usage

### Programmatic API

You can use the CLI commands programmatically in your scripts:

\`\`\`javascript
import { initCommand } from "@nebutra/cli/commands/init";
import { addCommand } from "@nebutra/cli/commands/add";

await initCommand();
await addCommand(["button", "input"], { "21st": undefined, v0: undefined });
\`\`\`

### Batch operations

Install multiple components at once:

\`\`\`bash
nebutra add button input card badge select checkbox radio
\`\`\`

---

## Support & Resources

- **Documentation**: https://nebutra.com/docs
- **GitHub**: https://github.com/nebutra/sailor
- **Community**: https://discord.gg/nebutra
- **Issues**: https://github.com/nebutra/sailor/issues

`;

  return doc;
}

/**
 * Write documentation to file
 */
function writeDocs(content: string, outputPath: string): void {
  const fullPath = path.isAbsolute(outputPath) ? outputPath : path.resolve(projectRoot, outputPath);
  const dir = path.dirname(fullPath);

  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(fullPath, content, "utf-8");
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const options = parseArgs();
  const outputPath = options.output || "apps/design-docs/content/cli-reference.md";

  const documentation = generateDocumentation();
  writeDocs(documentation, outputPath);
}

// Run
main().catch((error) => {
  console.error("✗ Error:", error.message);
  process.exit(1);
});
