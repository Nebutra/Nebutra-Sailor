# nebutra

> Governance-first CLI for Nebutra Sailor topology scaffolding, registry-backed feature installs, and platform operations.

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

# Add platform capabilities from the local registry
nebutra add cache --provider upstash-redis --yes

# Scaffold a topology-first app with the create-sailor flag surface
nebutra create ./my-app --region=hybrid --ai=openai,deepseek

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
| `add [components...]` | Add registry-backed platform features or external UI components (`--21st`, `--v0`) |
| `create` | Scaffold a topology-first Nebutra Sailor project through create-sailor |
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
| `auth` | Authentication setup |
| `billing` | Billing and subscription management |
| `preset` | List and apply SaaS presets |
| `test` | Run unit/E2E tests |
| `stats` | Monorepo overview and metrics |
| `schema` | Output full CLI schema (for agents) |
| `doctor` | Check project health |
| `admin` | Platform administration (tenants, health) |
| `community` | Community health and showcase |
| `ecosystem` | Template marketplace, ideas, showcase, and sync workflows |
| `services` | Microservice management |
| `search` | Search index management |
| `secrets` | Encrypted secrets management |
| `completions` | Generate shell completions for the current command surface |

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
nebutra schema create
nebutra schema add
nebutra schema --all
```

`schema create` exposes the current `create-sailor` value domains, including
region, auth, AI, storage, cache, webhooks, CMS, captcha, metering, and MCP
options. `schema add` exposes local registry features such as `queue`, `search`,
`cache`, `notifications`, `webhooks`, `cms`, `feature-flags`, and `captcha`.
