export const HELP_TEXT = `Usage: create-sailor [name] [options]

Arguments:
  name                   project directory (default: ./my-saas-app)

Options:
  -p, --pm <id>          npm | pnpm | yarn | bun (auto-detected)
      --orm <id>         prisma | drizzle | none
      --db <id>          postgres | mysql | sqlite | none
      --auth <id>        clerk | betterauth | none
      --payment <id>     stripe | lemon | wechat | alipay | none
      --ai <ids>         comma-separated provider ids (e.g. openai,anthropic)
      --deploy <target>  vercel | railway | cloudflare | selfhost
      --docs <id>        fumadocs | mintlify | docusaurus | nextra | vitepress | none
      --i18n             enable i18n (default: true)
      --no-i18n          disable
      --no-install       skip package install
      --no-git           skip git init
  -y, --yes              accept all defaults (non-interactive)
      --dry-run          preview actions without writing files
      --json             machine-readable output
      --no-color         disable color output
  -h, --help             show this help
  -v, --version          show version

Examples:
  $ npm create sailor@latest
  $ npm create sailor@latest my-app -y
  $ npm create sailor@latest my-app --auth=clerk --ai=openai,deepseek
  $ npm create sailor@latest --dry-run
`;

export function showHelp(): void {
  process.stdout.write(HELP_TEXT);
}
