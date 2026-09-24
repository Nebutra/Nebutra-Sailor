export const HELP_TEXT = `Usage: create-sailor [name] [options]

Arguments:
  name                      project name or path (default: my-app; use . for cwd)

There is nothing to choose. Every project gets the same converged stack:
  Next.js + Hono gateway · Postgres + Prisma · Better Auth · Stripe (+ WeChat Pay /
  Alipay) · Resend · S3-compatible storage (R2 / OSS) · QStash · Redis · Sentry ·
  PostHog · Turnstile · MCP

Every capability runs locally with an empty .env. Add a provider key to take it
live; \`nebutra status\` shows what is live and what each capability still needs.
China deployments: set NEBUTRA_LOCALE=cn (ICP footer, AIGC disclosure, phone login).

Options:
  -p, --pm <id>             npm | pnpm | yarn | bun (auto-detected)
      --no-install          skip package install
      --no-git              skip git init
  -y, --yes                 non-interactive
      --dry-run             preview actions without writing files
      --json                machine-readable output (NDJSON events)
      --no-color            disable color output
  -h, --help                show this help
  -v, --version             show version

Requires Node.js >= 22 (same floor as the monorepo).

Examples:
  $ npx create-sailor@latest my-app
  $ npx create-sailor@latest .
  $ npx create-sailor@latest my-app --json --no-install
`;

export function showHelp(): void {
  process.stdout.write(HELP_TEXT);
}
