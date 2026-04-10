# nebutra

> Unified CLI for Nebutra project scaffolding, component management, AI integration, and platform operations.

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

# Add components
nebutra add button card --yes

# Scaffold a new app
nebutra create ./my-app

# Start dev server
nebutra dev --preset=ai-saas

# Database migrations
nebutra db migrate

# Generate a new app or module
nebutra generate app blog

# Brand customization
nebutra brand palette --primary=#7C3AED

# Project health check
nebutra doctor
```

## Commands

| Command | Description |
|---------|-------------|
| `init` | Initialize project with `nebutra.config.json` |
| `add [components...]` | Add components (supports `--21st`, `--v0` sources) |
| `create` | Scaffold a new Nebutra project |
| `dev` | Start development server |
| `generate` | Scaffold apps, modules, and code |
| `db` | Database migration and management |
| `brand` | Color palette and brand customization |
| `i18n` | Internationalization management |
| `infra` | Infrastructure management (Docker, services) |
| `env` | Environment variable management |
| `license` | License activation and management |
| `ai` | AI provider configuration |
| `auth` | Authentication setup |
| `billing` | Billing and subscription management |
| `preset` | List and apply SaaS presets |
| `test` | Run unit/E2E tests |
| `stats` | Monorepo overview and metrics |
| `schema` | Output full CLI schema (for agents) |
| `doctor` | Check project health |
| `admin` | Platform administration (tenants, health) |
| `community` | Community health and showcase |
| `ecosystem` | Template marketplace and OPC network |
| `services` | Microservice management |
| `search` | Search index management |
| `secrets` | Encrypted secrets management |

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
