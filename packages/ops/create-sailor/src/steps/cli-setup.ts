/**
 * Commander program definition.
 * Exported as `buildProgram()` so index.ts can call `.parse()` and
 * pull out `opts` + `args` without any I/O being performed here.
 */

import { Command } from "commander";
import { VERSION } from "../version";
import type { CliOptions } from "./types";

const PKG_NAME = "create-sailor";

export function buildProgram(): Command {
  const program = new Command();
  program
    .name(PKG_NAME)
    .description("Nebutra-Sailor — AI-Native SaaS template")
    .version(VERSION, "-v, --version")
    .helpOption(false) // we render our own help
    .argument(
      "[name]",
      "project name or path (default: my-app; use . for current directory)",
      undefined,
    )
    .option("-p, --pm <id>", "npm | pnpm | yarn | bun")
    .option("--region <id>", "global | cn | hybrid")
    .option(
      "--orm <id>",
      "prisma (default, primary) | drizzle (dual-ORM: adds db-drizzle alongside Prisma — Postgres only)",
    )
    .option("--db <id>", "postgres | mysql | sqlite | none — engine (Prisma provider)")
    .option(
      "--db-host <id>",
      "local | supabase | neon | vercel-postgres | planetscale | railway | aliyun-rds | tencent-cdb | none — managed-provider (region default: supabase global, local cn)",
    )
    .option("--auth <id>", "clerk | betterauth | nextauth | supabase | none")
    .option(
      "--social-login <ids>",
      "CN social login providers — wechat | qq | dingtalk | workweixin | feishu | weibo (comma-separated)",
    )
    .option("--payment <id>", "stripe | lemon | wechat | alipay | none")
    .option(
      "--ai <mode-or-ids>",
      "topology shorthand (gateway | direct | custom | none) OR comma-separated provider ids (e.g. openai,anthropic)",
    )
    .option("--deploy <target>", "vercel | railway | cloudflare | selfhost")
    .option("--docs <id>", "fumadocs | mintlify | docusaurus | nextra | vitepress | none")
    .option("--email <id>", "resend | postmark | ses | aliyun-dm | tencent-ses | netease | none")
    .option(
      "--storage <id>",
      "r2 | s3 | supabase-storage | aliyun-oss | tencent-cos | qiniu | none",
    )
    .option("--monitoring <id>", "sentry | datadog | aliyun-arms | tingyun | none")
    .option("--analytics <id>", "posthog | plausible | umami | baidu | sensors | none")
    .option("--sms <id>", "twilio | aliyun-sms | tencent-sms | yunpian | none")
    .option("--queue <id>", "qstash | bullmq | sqs | none")
    .option("--search <id>", "meilisearch | typesense | algolia | pgvector | none")
    .option("--cache <id>", "upstash-redis | vercel-kv | redis | dragonfly | none")
    .option("--notifications <id>", "novu | knock | custom | none")
    .option("--webhooks <id>", "svix | custom | none")
    .option("--cms <id>", "sanity | contentful | strapi | none")
    .option("--feature-flags <id>", "vercel-flags | growthbook | configcat | none")
    .option("--captcha <id>", "turnstile | hcaptcha | aliyun-slide | none")
    .option("--mcp <mode>", "on | off (default: on)")
    .option("--metering <mode>", "auto | on | off (default: auto — auto-on when payment is set)")
    .option("--billing-mode <mode>", "usage | seat | credits (default: usage)")
    .option("--idp <id>", "clerk | oauth-server (default: clerk)")
    .option("--access-gate <mode>", "none | invite (default: none)")
    // Wave 3-5 feature toggles — accept `true|false`. Defaults are `true`
    // except `--audit-log` (backing package is WIP, opt-in) and
    // `--china-compliance` (auto-flips with --region=cn).
    .option("--cron-jobs <bool>", "true | false — scaffold scheduled cron handlers (default: true)")
    .option(
      "--audit-log <bool>",
      "true | false — enable /settings/audit-log + arch test (default: false — @nebutra/audit is WIP)",
    )
    .option("--api-keys <bool>", "true | false — enable /settings/api-keys page (default: true)")
    .option("--command-palette <bool>", "true | false — enable ⌘K command palette (default: true)")
    .option(
      "--cookie-consent <bool>",
      "true | false — enable GDPR/CCPA cookie banner (default: true)",
    )
    .option(
      "--legal-pages <bool>",
      "true | false — enable dynamic /legal/[slug] route (default: true)",
    )
    .option(
      "--china-compliance <bool>",
      "true | false — enable @nebutra/china-compliance + ICP footer (default: true when --region=cn, otherwise false)",
    )
    .option("--i18n", "enable i18n")
    .option("--no-i18n", "disable i18n")
    .option("--with-workflows", "scaffold workflows/ (inngest + n8n + pusher stubs)")
    .option(
      "--with-python-backend",
      "scaffold backends/python/ (FastAPI stub — only when TS-by-Default ADR exception applies)",
    )
    .option("--no-install", "skip package install")
    .option("--no-git", "skip git init")
    .option("-y, --yes", "accept all defaults (non-interactive)")
    .option("--dry-run", "preview actions without writing files")
    .option("--json", "machine-readable output")
    .option("--no-color", "disable color output")
    .option("-h, --help", "show help");

  return program;
}

// Re-export the type for consumers
export type { CliOptions };
