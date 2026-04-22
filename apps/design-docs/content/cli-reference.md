# Nebutra CLI Reference

> **Auto-generated from CLI source code** — Do not edit manually.
>
> Generated: 2026-03-29T15:49:31.698Z

This reference documents all commands available in the Nebutra CLI ecosystem.

---

## Overview

The Nebutra CLI suite provides three main tools:

1. **`nebutra`** — Package & component manager, project initialization, and AI integration
2. **`create-sailor`** — Project scaffolding tool for bootstrapping new Nebutra-Sailor applications
3. **`nebutra-mcp`** — MCP server for Cursor/Windsurf AI integration

---

## `nebutra`

Nebutra Package & Component Manager

**Usage:**
```bash
nebutra [command] [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|----------|
| `--format <type>` | Output format: json, table, plain | — |
| `--yes, --no-interactive` | Skip all interactive prompts (Agent mode) | — |
| `--no-color` | Disable colored output | — |
| `--verbose` | Enable verbose output | — |
| `--quiet` | Suppress non-essential output | — |
### `init`

Initialize a Nebutra project and create nebutra.config.json

**Usage:**
```bash
nebutra init [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|----------|
| `--dry-run` | Preview changes without writing files (exits with code 10) | — |
| `--yes` | Skip all interactive prompts (Agent mode) | — |
| `--if-not-exists` | Skip initialization if nebutra.config.json already exists | — |

**Examples:**

```bash
nebutra init
```
Initialize Nebutra configuration in the current directory

```bash
nebutra init --dry-run
```
Preview initialization changes without writing files

```bash
nebutra init --yes --if-not-exists
```
Initialize without prompts, skip if already configured

### `add`

Add a component or feature to your project

**Usage:**
```bash
nebutra add [components...] [options]
```

**Arguments:**

| Argument | Description | Required |
|----------|-------------|----------|
| `components` (variadic) | Component names to add from the HeroUI component library | No |
**Options:**

| Option | Description | Default |
|--------|-------------|----------|
| `--21st <id>` | Fetch and install a component from 21st.dev registry | — |
| `--v0 <url>` | Fetch and install a component from v0.dev by URL | — |
| `--dry-run` | Preview what would be installed without making changes (exit code 10) | — |
| `--yes` | Skip all interactive prompts and use defaults (Agent mode) | — |
| `--if-not-exists` | Skip installation if component already exists | — |

**Examples:**

```bash
nebutra add button input card
```
Add HeroUI components (button, input, card) to your project

```bash
nebutra add --21st button-01
```
Add a component from 21st.dev (shadcn-style registry)

```bash
nebutra add --v0 "https://v0.dev/r/..." --dry-run
```
Preview adding a component from v0.dev without making changes

```bash
nebutra add button --yes --if-not-exists
```
Add button component without prompts, skip if already exists

### `create`

Scaffold a new Nebutra-Sailor project

**Usage:**
```bash
nebutra create [dir] [options]
```

**Arguments:**

| Argument | Description | Required |
|----------|-------------|----------|
| `dir` | Target directory for the new project (optional, will prompt if not provided) | No |
**Options:**

| Option | Description | Default |
|--------|-------------|----------|
| `--dry-run` | Preview project scaffolding without creating files (exit code 10) | — |
| `--yes` | Skip all interactive prompts (Agent mode) | — |

**Examples:**

```bash
nebutra create my-saas-app
```
Create a new Nebutra-Sailor project in the my-saas-app directory with interactive prompts

```bash
nebutra create
```
Create a new project with prompts for directory and configuration

```bash
nebutra create my-app --dry-run
```
Preview project scaffolding without creating files

### `mcp`

Start the Nebutra MCP server for Cursor/Windsurf integration

**Usage:**
```bash
nebutra mcp [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|----------|
| `--stdio` | Use stdio transport for communication (default: enabled) | enabled |
| `--verbose` | Enable verbose logging for MCP server | — |

**Examples:**

```bash
nebutra mcp
```
Start the MCP server for AI-powered project context integration

```bash
nebutra mcp --verbose
```
Start the MCP server with detailed logging output

### `schema`

Show command schema and argument documentation (Agent-friendly JSON output)

**Usage:**
```bash
nebutra schema [command] [options]
```

**Arguments:**

| Argument | Description | Required |
|----------|-------------|----------|
| `command` | Command name to show schema for (e.g., init, add, create) | No |
**Options:**

| Option | Description | Default |
|--------|-------------|----------|
| `--all` | Show full schema for all commands as JSON | disabled |
| `--list` | List all available command names | disabled |
| `--exit-codes` | Show exit codes reference | disabled |

**Examples:**

```bash
nebutra schema --all
```
Show complete JSON of all commands, args, options, value domains

```bash
nebutra schema init
```
Show schema for init command (arguments, options, defaults, examples)

```bash
nebutra schema add
```
Show schema for add command with enum values

```bash
nebutra schema --list
```
List just the command names (quick discovery)

```bash
nebutra schema --exit-codes
```
Show exit codes reference for all possible exit codes

---

## `create-sailor`

CLI to bootstrap Nebutra-Sailor scaffolding and create new projects

**Usage:**
```bash
create-sailor [dir]
```

**Arguments:**

| Argument | Description | Required |
|----------|-------------|----------|
| `dir` | Target directory to initialize the project in (optional, will prompt if not provided) | No |

**Examples:**

```bash
npx create-sailor@latest my-project
```
Create a new Nebutra-Sailor project in the `my-project` directory

```bash
npx create-sailor@latest
```
Create a new project with interactive prompts for all configuration options

```bash
npm create sailor@latest my-startup
```
Alternative syntax: use npm create to run the create-sailor CLI

---

## `nebutra-mcp`

Model Context Protocol (MCP) server that exposes Nebutra project structure and tools to Cursor/Windsurf

**Usage:**
```bash
nebutra-mcp
```


**Examples:**

```bash
nebutra mcp
```
Start the MCP server via the nebutra CLI

---

## Getting Help

Each command supports `--help` to display inline documentation:

```bash
nebutra --help
nebutra init --help
nebutra add --help
nebutra create --help
nebutra mcp --help
```

## Installation

### Install globally via npm

```bash
npm install -g nebutra
```

### Install in a project

```bash
pnpm add --save-dev nebutra
pnpm exec nebutra init
```

### Use with create

```bash
npx create-sailor@latest my-app
```

---

## Common Workflows

### Initialize a new project

```bash
nebutra init
```

This creates a `nebutra.config.json` file in the current directory with sensible defaults.

### Add UI components

```bash
# From HeroUI library
nebutra add button input card

# From 21st.dev (shadcn-style)
nebutra add --21st button-01

# From v0.dev
nebutra add --v0 "https://v0.dev/r/xxxxx"
```

### Create a full-stack SaaS application

```bash
nebutra create my-startup

# Then follow interactive prompts for:
# - Application type (SaaS, Full monorepo, E-Commerce, Web3)
# - ORM (Prisma, Drizzle, None)
# - Database (PostgreSQL, MySQL, SQLite, None)
# - Payment provider (Stripe, Lemon Squeezy, None)
# - AI provider (OpenAI, Anthropic, None)
# - Internationalization (i18n) support
```

### Start the MCP server for AI integration

```bash
nebutra mcp
```

This starts a Model Context Protocol server that exposes your project structure to Cursor and Windsurf,
enabling AI assistants to understand your codebase instantly.

---

## Configuration

### nebutra.config.json

The `nebutra init` command creates a `nebutra.config.json` file:

```json
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
```

This configuration tells the CLI where your components are located and how to integrate with Tailwind.

### create-sailor Interactive Prompts

When running `create-sailor` or `nebutra create`, you'll be prompted for:

- **Application Type**: SaaS, Full monorepo, E-Commerce, or Web3
- **ORM**: Prisma (recommended), Drizzle, or None
- **Database**: PostgreSQL, MySQL, SQLite, or None
- **Payment**: Stripe, Lemon Squeezy, or None
- **AI Provider**: OpenAI, Anthropic, or None
- **i18n Support**: Enable internationalization

You can also provide environment variables:
- `DATABASE_URL`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

---

## Troubleshooting

### Command not found

If `nebutra` or `create-sailor` cannot be found:

1. Ensure it's installed globally: `npm install -g nebutra`
2. Or run with `pnpm exec nebutra` in your project
3. Check your PATH: `echo $PATH`

### create-sailor fails to launch

If `nebutra create` cannot start `create-sailor`:

1. Ensure `create-sailor` is installed: `npm install -g create-sailor`
2. Or install locally: `pnpm add --save-dev create-sailor`

### MCP server fails to start

If `nebutra mcp` cannot start:

1. Ensure `@nebutra/mcp` is installed: `npm install -g @nebutra/mcp`
2. Check that Node.js version is >= 22.0.0: `node --version`

---

## Environment Variables

The CLI respects these environment variables:

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | Set to `development` for verbose logging |
| `EDITOR` | Editor to use for interactive prompts |

---

## Advanced Usage

### Monorepo Internal API

For internal tooling inside the Nebutra-Sailor monorepo, import command helpers from the source tree directly:

```javascript
import { initCommand } from "../../packages/cli/src/commands/init.js";
import { addCommand } from "../../packages/cli/src/commands/add.js";

await initCommand();
await addCommand(["button", "input"], { "21st": undefined, v0: undefined });
```

### Batch operations

Install multiple components at once:

```bash
nebutra add button input card badge select checkbox radio
```

---

## Support & Resources

- **Documentation**: https://nebutra.com/docs
- **GitHub**: https://github.com/nebutra/sailor
- **Community**: https://discord.gg/nebutra
- **Issues**: https://github.com/nebutra/sailor/issues
