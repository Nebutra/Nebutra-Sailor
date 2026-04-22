export const HELP_TEXT = `Usage: create-sailor [name] [options]

Arguments:
  name                      project directory (default: ./my-saas-app)

Core options:
  -p, --pm <id>             npm | pnpm | yarn | bun (auto-detected)
      --region <id>         global | cn | hybrid (default: global)
      --auth <id>           clerk | betterauth | none
      --ai <ids>            comma-separated provider ids (e.g. openai,anthropic)

Stack flags (region-based smart defaults):
      --orm <id>            prisma | drizzle | none                 (default: prisma)
      --db <id>             postgres | mysql | sqlite | none        (default: postgres)
      --payment <id>        stripe | lemon | wechat | alipay | none (default: region-based)
      --deploy <target>     vercel | railway | cloudflare | selfhost (default: vercel)
      --docs <id>           fumadocs | mintlify | docusaurus | nextra | vitepress | none

Feature flags (region-based smart defaults):
      --email <id>          resend | postmark | ses | aliyun-dm | tencent-ses | netease | none
      --storage <id>        r2 | s3 | supabase | aliyun-oss | tencent-cos | qiniu | none
      --monitoring <id>     sentry | datadog | aliyun-arms | tingyun | none
      --analytics <id>      posthog | plausible | umami | baidu | sensors | none
      --sms <id>            twilio | aliyun-sms | tencent-sms | yunpian | none
      --queue <id>          qstash | bullmq | upstash | sqs | none                 [Foundation]
      --search <id>         meilisearch | typesense | algolia | pgvector | none    [Foundation]
      --cache <id>          upstash-redis | vercel-kv | redis | dragonfly | none
      --notifications <id>  novu | knock | custom | none                           [Foundation]
      --webhooks <id>       svix | custom | none                                   [Foundation]
      --cms <id>            sanity | contentful | strapi | none
      --feature-flags <id>  vercel-flags | growthbook | configcat | none           [WIP]
      --captcha <id>        turnstile | hcaptcha | aliyun-slide | none             [WIP]
      --billing-mode <mode> usage | seat | credits (default: usage)
      --idp <id>            clerk | oauth-server (default: clerk)

Preview statuses:
  [Foundation] — types + factory complete; adapters need external credentials & may not work out-of-the-box
  [WIP]        — actively being built; do not use in production
  See: https://github.com/Nebutra/Nebutra-Sailor/blob/main/docs/package-status.md

Sailor features:
      --mcp <mode>          on | off (default: on — Agent-friendly MCP server)
      --metering <mode>     auto | on | off (default: auto)

Toggles:
      --i18n                enable i18n (default: true)
      --no-i18n             disable
      --no-install          skip package install
      --no-git              skip git init
  -y, --yes                 accept all defaults (non-interactive)
      --dry-run             preview actions without writing files
      --json                machine-readable output
      --no-color            disable color output
  -h, --help                show this help
  -v, --version             show version

Examples:
  $ npx create-sailor@latest
  $ npx create-sailor@latest my-app -y
  $ npx create-sailor@latest my-app --region=cn --auth=clerk
  $ npx create-sailor@latest my-app --region=hybrid --ai=openai,deepseek
  $ npm create sailor@latest --dry-run --region=cn
`;

export function showHelp(): void {
  process.stdout.write(HELP_TEXT);
}
