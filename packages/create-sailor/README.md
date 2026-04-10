# create-sailor

> Interactive scaffolding tool to bootstrap a new Nebutra-Sailor project.

## Usage

```bash
npx create-sailor
# or specify a directory
npx create-sailor ./my-saas-app
```

## What it does

1. Prompts for application type (Standard SaaS, Full Monorepo, E-Commerce, Web3)
2. Asks for ORM preference (Prisma, Drizzle, or none)
3. Selects database provider (PostgreSQL, MySQL, SQLite)
4. Chooses payment provider (Stripe, Lemon Squeezy)
5. Picks default AI provider (OpenAI, Anthropic)
6. Optionally enables i18n
7. Collects environment variables (database URL, Clerk keys)
8. Clones the Nebutra-Sailor template and configures it

## After scaffolding

```bash
cd my-saas-app
pnpm install
pnpm dev
```

## Configuration Options

| Option | Choices |
|--------|---------|
| Application type | `saas`, `full`, `ecommerce`, `web3` |
| ORM | `prisma` (default), `drizzle`, `none` |
| Database | `postgresql` (default), `mysql`, `sqlite`, `none` |
| Payment | `stripe` (default), `lemonsqueezy`, `none` |
| AI Provider | `openai` (default), `anthropic`, `none` |
| i18n | `true` (default) / `false` |

## Dependencies

- `@clack/prompts` -- interactive CLI prompts
- `commander` -- argument parsing
- `picocolors` -- terminal colors
