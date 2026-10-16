export const HELP_TEXT = `Usage: create-sailor [name] [options]

Arguments:
  name                      project name or path (default: my-app; use . for cwd)

There is nothing to choose. Every project gets the same converged stack:
  Next.js + Hono gateway · Postgres + Prisma · Better Auth · Creem (+ WeChat Pay /
  Alipay) · Resend · S3-compatible storage (R2 / OSS) · QStash · Redis · Sentry ·
  PostHog · Turnstile · MCP

Every capability runs locally with an empty .env. Add a provider key to take it
live; \`pnpm nebutra status\` shows what is live and what each capability still needs.
China deployments: set NEBUTRA_LOCALE=cn (WeChat Pay / Alipay first at checkout,
Aliyun first for SMS); NEXT_PUBLIC_ICP_NUMBER shows the ICP footer.

Options:
  -p, --pm <id>             package manager (default: pnpm — the workspace needs it)
      --no-install          skip package install
      --no-git              skip git init
  -y, --yes                 non-interactive
      --preset <code>       the look from Sailor Studio (preset code or language id)
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
