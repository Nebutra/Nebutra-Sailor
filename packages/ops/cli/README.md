# nebutra

> The CLI for Sailor projects: status, dev, db, and codegen.

## Installation

```bash
npm install -g nebutra
# or run directly
npx nebutra
```

## Usage

```bash
# Initialize a new project
nebutra init

# Check capability readiness (live / local-fallback / missing-key)
nebutra status

# Sync .env.example / .env.local with the capabilities declared in nebutra.config.json
nebutra sync

# Scaffold a new project (separate tool — one creation entry point)
npx create-sailor ./my-app

# Start dev server
nebutra dev --preset=ai-saas

# Database migrations
nebutra db migrate

# Generate a new app or module
nebutra generate app blog

# Brand customization
nebutra brand palette --primary=#0047FF

# Project health check
nebutra doctor
```

## Commands

| Command | Description |
|---------|-------------|
| `init` | Initialize project with `nebutra.config.json` |
| `status` | Show capability readiness — live, local-fallback, or missing-key, per env (`--json`) |
| `sync` | Make `.env.example`/`.env.local` agree with declared capabilities, idempotently (`--dry-run`, `--json`) |
| `mcp` | Start the MCP server for AI agents and editors |
| `dev` | Start development server |
| `generate` | Scaffold apps, modules, and code |
| `db` | Database migration and management |
| `brand` | Color palette and brand customization |
| `i18n` | Internationalization management |
| `infra` | Infrastructure management (Docker, services) |
| `env` | Environment variable management |
| `license` | License activation and management |
| `ai` | AI provider and gateway routing configuration |
| `test` | Run unit/E2E tests |
| `schema` | Output full CLI schema (for agents) |
| `doctor` | Check project health |
| `services` | Microservice management |
| `secrets` | Encrypted secrets management |
| `completions` | Generate shell completions for the current command surface |
| `link` / `unlink` | Link or unlink the project to Nebutra platform metadata |
| `logout` / `upgrade` | Session and CLI lifecycle |

Scaffolding, registry, and platform-operations commands (`create`, `add`,
`auth`, `billing`, `admin`, `community`, `growth`, `ecosystem`, `search`,
`stats`, `workflow`, `backend`) have moved out of this published package —
project creation is `create-sailor`; the rest are internal Nebutra tooling
(ADR 2026-09-24 Sailor convergence §7).

## Global Options

| Flag | Description |
|------|-------------|
| `--verbose` | Enable verbose output |
| `--quiet` | Suppress non-essential output |
| `--format <type>` | Output format: `json`, `table`, `plain` |
| `--yes` | Skip interactive prompts (CI/agent mode) |
| `--no-color` | Disable colored output |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEBUTRA_LOG_LEVEL` | Log level (`debug`, `info`, `warn`, `error`) |
| `NEBUTRA_OUTPUT_FORMAT` | Default output format |
| `NO_COLOR` | Disable colored output |
| `CI` | Auto-enable non-interactive mode |

## Agent Schema

```bash
nebutra schema status
nebutra schema --all
nebutra status --json
```

`schema <command>` exposes a single command's arguments, options, and
examples as JSON. `status --json` exposes live project state — per-capability
readiness for the capabilities declared in `nebutra.config.json` — not static
command metadata.
