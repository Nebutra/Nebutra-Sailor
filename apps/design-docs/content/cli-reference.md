# Nebutra CLI Reference

> **Auto-generated from CLI source code** — Do not edit manually.
>
> Generated: 2026-03-29T15:31:21.559Z

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

### `init`

Initialize a Nebutra project and create nebutra.config.json

**Usage:**
```bash
nebutra init
```


**Examples:**

```bash
nebutra init
```
Initialize Nebutra configuration in the current directory

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
nebutra add --v0 "https://v0.dev/r/..."
```
Add a component from v0.dev by its full URL

### `create`

Scaffold a new Nebutra-Sailor project

**Usage:**
```bash
nebutra create [dir]
```

**Arguments:**

| Argument | Description | Required |
|----------|-------------|----------|
| `dir` | Target directory for the new project (optional, will prompt if not provided) | No |

**Examples:**

```bash
nebutra create my-saas-app
```
Create a new Nebutra-Sailor project in the my-saas-app directory with interactive prompts

```bash
nebutra create
```
Create a new project with prompts for directory and configuration

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

**Examples:**

```bash
nebutra mcp
```
Start the MCP server for AI-powered project context integration

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
create-sailor my-project
```
Create a new Nebutra-Sailor project in the my-project directory

```bash
create-sailor
```
Create a new project with interactive prompts for all configuration options

```bash
npm create sailor my-startup
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
npm install -g @nebutra/cli
```

### Install in a project

```bash
pnpm install --save-dev @nebutra/cli
pnpm exec nebutra init
```

### Use with create

```bash
npm create sailor my-app
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

1. Ensure it's installed globally: `npm install -g @nebutra/cli`
2. Or run with `pnpm exec nebutra` in your project
3. Check your PATH: `echo $PATH`

### create-sailor fails to launch

If `nebutra create` cannot start `create-sailor`:

1. Ensure `@nebutra/create-sailor` is installed: `npm install -g @nebutra/create-sailor`
2. Or install locally: `pnpm install --save-dev @nebutra/create-sailor`

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

### Programmatic API

You can use the CLI commands programmatically in your scripts:

```javascript
import { initCommand } from "@nebutra/cli/commands/init";
import { addCommand } from "@nebutra/cli/commands/add";

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

