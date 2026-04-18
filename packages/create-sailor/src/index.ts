#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import { Command } from "commander";
import pc from "picocolors";
import updateNotifier from "update-notifier";
import { showBanner } from "./ui/banner.js";
import { showDone } from "./ui/done.js";
import { showHelp } from "./ui/help.js";
import { printProgressLine } from "./ui/progress.js";
import { PROVIDERS } from "./utils/ai-meta.js";
import { emitScaffoldCompleted } from "./utils/analytics-emit.js";
import { applyAnalyticsSelection } from "./utils/analytics.js";
import { type AuthChoice, applyAuthSelection } from "./utils/auth.js";
import {
  parseSocialLoginFlag,
  SOCIAL_LOGIN_PROVIDERS,
  type SocialLoginId,
} from "./utils/auth-social.js";
import { applySocialLoginProviders } from "./utils/auth-social-apply.js";
import { applyCacheSelection } from "./utils/cache.js";
import { applyCaptchaSelection } from "./utils/captcha.js";
import { applyCmsSelection } from "./utils/cms.js";
import { applyComplianceTemplates } from "./utils/compliance.js";
import {
  type CustomEndpoint,
  type DocsFramework,
  type NebutraConfig,
  type Region,
  writeNebutraConfig,
} from "./utils/config.js";
import { applyDatabaseSelection } from "./utils/database.js";
import { applyDeployTarget } from "./utils/deploy.js";
import { applyDocsTemplate } from "./utils/docs.js";
import { applyEmailSelection } from "./utils/email.js";
import { injectEnv } from "./utils/env.js";
import { generateEnvSecrets } from "./utils/env-secrets.js";
import { applyFeatureFlagsSelection } from "./utils/feature-flags.js";
import { cloneTemplate } from "./utils/git.js";
import { applyMcpSwitch } from "./utils/mcp.js";
import { applyMeteringSwitch } from "./utils/metering.js";
import { applyMonitoringSelection } from "./utils/monitoring.js";
import { applyNotificationsSelection } from "./utils/notifications.js";
import { updatePackageJson } from "./utils/npm.js";
import {
  collectPreviewSelections,
  describeStatus,
  formatStatusBadge,
  type PreviewSelection,
} from "./utils/package-status.js";
import { applyPaymentSelection, type PaymentChoice } from "./utils/payment.js";
import { applyProviderSelection } from "./utils/providers.js";
import { pruneTemplate } from "./utils/prune.js";
import { pruneSchemaByFlags } from "./utils/prune-schema.js";
import { applyQueueSelection } from "./utils/queue.js";
import { applySearchSelection } from "./utils/search.js";
import { generateSeedData } from "./utils/seed.js";
import { applySmsSelection } from "./utils/sms.js";
import { applyStorageSelection } from "./utils/storage.js";
import { applyWebhooksSelection } from "./utils/webhooks.js";
import { generateWelcomePage } from "./utils/welcome.js";
import { VERSION } from "./version.js";

const PKG_NAME = "create-sailor";

interface CliOptions {
  pm?: string;
  region?: string;
  orm?: string;
  db?: string;
  auth?: string;
  socialLogin?: string;
  payment?: string;
  ai?: string;
  deploy?: string;
  docs?: string;
  email?: string;
  storage?: string;
  monitoring?: string;
  analytics?: string;
  sms?: string;
  queue?: string;
  search?: string;
  cache?: string;
  notifications?: string;
  webhooks?: string;
  cms?: string;
  featureFlags?: string;
  captcha?: string;
  mcp?: string;
  metering?: string;
  billingMode?: string;
  idp?: string;
  i18n?: boolean;
  install?: boolean;
  git?: boolean;
  yes?: boolean;
  dryRun?: boolean;
  json?: boolean;
  color?: boolean;
  help?: boolean;
}

type JsonEvent = {
  event: string;
  step?: string;
  status?: "ok" | "error" | "skip" | "start";
  message?: string;
  [k: string]: unknown;
};

function emitJson(useJson: boolean, payload: JsonEvent): void {
  if (useJson) process.stdout.write(JSON.stringify(payload) + "\n");
}

function detectPm(): "npm" | "pnpm" | "yarn" | "bun" {
  const ua = process.env.npm_config_user_agent ?? "";
  if (ua.startsWith("pnpm")) return "pnpm";
  if (ua.startsWith("yarn")) return "yarn";
  if (ua.startsWith("bun")) return "bun";
  return "npm";
}

function mapDb(d: string | undefined): NebutraConfig["database"] {
  switch (d) {
    case "postgres":
    case "postgresql":
      return "postgresql";
    case "mysql":
      return "mysql";
    case "sqlite":
      return "sqlite";
    case "none":
      return "none";
    default:
      return "postgresql";
  }
}

function mapOrm(o: string | undefined): NebutraConfig["orm"] {
  if (o === "drizzle") return "drizzle";
  if (o === "none") return "none";
  return "prisma";
}

function mapPayment(p: string | undefined): NebutraConfig["payment"] {
  if (p === "lemon" || p === "lemonsqueezy") return "lemonsqueezy";
  if (p === "none") return "none";
  // wechat / alipay / stripe → treat non-stripe alternatives as stripe-compatible placeholder
  return "stripe";
}

/**
 * Resolve the raw --payment CLI value to a PaymentChoice that preserves the
 * full provider granularity needed by `applyPaymentSelection` (wechat/alipay
 * are not collapsed into "stripe").
 */
function resolvePaymentChoice(raw: string | undefined): PaymentChoice {
  if (!raw) return "stripe";
  const v = raw.toLowerCase();
  if (v === "lemon" || v === "lemonsqueezy") return "lemon";
  if (v === "wechat") return "wechat";
  if (v === "alipay") return "alipay";
  if (v === "none") return "none";
  return "stripe";
}

/**
 * Resolve the raw --auth CLI value to an AuthChoice.
 */
function resolveAuthChoice(raw: string | undefined): AuthChoice {
  if (!raw) return "clerk";
  const v = raw.toLowerCase();
  if (v === "betterauth" || v === "better-auth") return "betterauth";
  if (v === "none") return "none";
  return "clerk";
}

function mapAi(ids: string | undefined): string[] {
  if (!ids) return ["openai"];
  const list = ids.split(",").map((s) => s.trim().toLowerCase());
  if (list.includes("none")) return [];
  return list;
}

const DOCS_COMING_SOON: Record<string, string> = {
  mintlify: "Mintlify",
  docusaurus: "Docusaurus",
  nextra: "Nextra",
  vitepress: "VitePress",
};

function resolveDocs(raw: string | undefined, useJson: boolean): DocsFramework {
  if (!raw) return "fumadocs";
  const v = raw.toLowerCase();
  if (v === "fumadocs" || v === "none") return v;
  if (v in DOCS_COMING_SOON) {
    const label = DOCS_COMING_SOON[v];
    if (!useJson) {
      process.stdout.write(
        pc.yellow(`⚠  ${label} support is coming in v1.2. Falling back to fumadocs.\n`) +
          pc.dim("   Track progress: https://github.com/Nebutra/Nebutra-Sailor/issues\n"),
      );
    } else {
      emitJson(true, {
        event: "notice",
        kind: "docs-fallback",
        requested: v,
        effective: "fumadocs",
      });
    }
    return "fumadocs";
  }
  return "fumadocs";
}

function mapDeploy(d: string | undefined): NebutraConfig["deployTarget"] {
  switch (d) {
    case "vercel":
      return "vercel";
    case "railway":
      return "railway";
    case "cloudflare":
      return "cloudflare";
    case "selfhost":
      return "selfhost";
    case "none":
      return "none";
    default:
      return "vercel";
  }
}

function resolveRegion(raw: string | undefined): Region {
  if (!raw) return "global";
  const v = raw.toLowerCase();
  if (v === "cn") return "cn";
  if (v === "hybrid") return "hybrid";
  return "global";
}

interface RegionDefaults {
  email: string;
  storage: string;
  monitoring: string;
  analytics: string;
  sms: string;
  queue: string;
  search: string;
  cache: string;
  notifications: string;
  webhooks: string;
  cms: string;
  featureFlags: string;
  captcha: string;
  mcp: string;
  metering: string;
  billingMode: string;
  idp: string;
}

function regionDefaults(region: Region): RegionDefaults {
  const base = (() => {
    if (region === "cn") {
      return {
        email: "aliyun-dm",
        storage: "aliyun-oss",
        monitoring: "sentry",
        analytics: "baidu",
        sms: "aliyun-sms",
      };
    }
    if (region === "hybrid") {
      return {
        email: "resend",
        storage: "aliyun-oss",
        monitoring: "sentry",
        analytics: "posthog",
        sms: "aliyun-sms",
      };
    }
    // global
    return {
      email: "resend",
      storage: "r2",
      monitoring: "sentry",
      analytics: "posthog",
      sms: "twilio",
    };
  })();

  return {
    ...base,
    queue: "none", // opt-in, no default
    search: "none", // opt-in
    cache: region === "global" ? "upstash-redis" : region === "cn" ? "redis" : "upstash-redis",
    notifications: "none",
    webhooks: "none",
    cms: "none",
    featureFlags: "none",
    captcha: region === "cn" ? "aliyun-slide" : "turnstile",
    mcp: "on", // Sailor core value
    metering: "auto", // auto-enable if payment is set
    billingMode: "usage", // all regions default to usage-based billing
    idp: "clerk", // all regions default — users pick oauth-server explicitly if self-hosting IDP
  };
}

function defaultPaymentForRegion(region: Region): string {
  return region === "cn" ? "wechat" : "stripe";
}

async function run(): Promise<void> {
  const program = new Command();
  program
    .name(PKG_NAME)
    .description("Nebutra-Sailor — AI-Native SaaS template")
    .version(VERSION, "-v, --version")
    .helpOption(false) // we render our own help
    .argument("[name]", "project directory", undefined)
    .option("-p, --pm <id>", "npm | pnpm | yarn | bun")
    .option("--region <id>", "global | cn | hybrid")
    .option("--orm <id>", "prisma | drizzle | none")
    .option("--db <id>", "postgres | mysql | sqlite | none")
    .option("--auth <id>", "clerk | betterauth | none")
    .option(
      "--social-login <ids>",
      "CN social login providers — wechat | qq | dingtalk | workweixin | feishu | weibo (comma-separated)",
    )
    .option("--payment <id>", "stripe | lemon | wechat | alipay | none")
    .option("--ai <ids>", "comma-separated provider ids")
    .option("--deploy <target>", "vercel | railway | cloudflare | selfhost")
    .option("--docs <id>", "fumadocs | mintlify | docusaurus | nextra | vitepress | none")
    .option("--email <id>", "resend | postmark | ses | aliyun-dm | tencent-ses | netease | none")
    .option("--storage <id>", "r2 | s3 | supabase | aliyun-oss | tencent-cos | qiniu | none")
    .option("--monitoring <id>", "sentry | datadog | aliyun-arms | tingyun | none")
    .option("--analytics <id>", "posthog | plausible | umami | baidu | sensors | none")
    .option("--sms <id>", "twilio | aliyun-sms | tencent-sms | yunpian | none")
    .option("--queue <id>", "qstash | bullmq | upstash | sqs | none")
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
    .option("--i18n", "enable i18n")
    .option("--no-i18n", "disable i18n")
    .option("--no-install", "skip package install")
    .option("--no-git", "skip git init")
    .option("-y, --yes", "accept all defaults (non-interactive)")
    .option("--dry-run", "preview actions without writing files")
    .option("--json", "machine-readable output")
    .option("--no-color", "disable color output")
    .option("-h, --help", "show help");

  program.parse(process.argv);
  const opts = program.opts<CliOptions>();
  const [nameArg] = program.args;

  if (opts.help) {
    showHelp();
    process.exit(0);
  }

  const useJson = Boolean(opts.json);
  const isDry = Boolean(opts.dryRun);
  const autoYes = Boolean(opts.yes);
  const nonInteractive = autoYes || !process.stdin.isTTY;

  if (!useJson) showBanner();
  emitJson(useJson, { event: "start", version: VERSION });

  const targetDir = nameArg ?? (autoYes ? "./my-saas-app" : undefined);
  let resolvedTarget: string;

  if (!targetDir) {
    if (nonInteractive) {
      resolvedTarget = "./my-saas-app";
    } else {
      const project = await p.group(
        {
          name: () =>
            p.text({
              message: "Where should we create your project?",
              placeholder: "./my-saas-app",
              defaultValue: "./my-saas-app",
              validate: (value) => {
                if (value.length === 0) return "Please enter a path.";
              },
            }),
        },
        {
          onCancel: () => {
            process.stdout.write(pc.red("✘ Cancelled\n"));
            process.exit(130);
          },
        },
      );
      resolvedTarget = String(project.name);
    }
  } else {
    resolvedTarget = targetDir;
  }

  const projectName = path.basename(path.resolve(resolvedTarget));

  // Resolve configuration — flags override prompts.
  const resolvedPm = opts.pm ?? detectPm();
  const hasRegion = !!opts.region;
  const hasAuth = !!opts.auth;
  const hasPayment = !!opts.payment;
  const hasAi = !!opts.ai;
  const hasEmail = !!opts.email;
  const hasStorage = !!opts.storage;
  const hasMonitoring = !!opts.monitoring;
  const hasAnalytics = !!opts.analytics;
  const hasSms = !!opts.sms;
  const hasI18n = opts.i18n !== undefined;

  let region: Region;
  let orm: NebutraConfig["orm"];
  let database: NebutraConfig["database"];
  let payment: NebutraConfig["payment"];
  let paymentChoice: PaymentChoice;
  let auth: AuthChoice;
  const socialLoginIds: SocialLoginId[] = parseSocialLoginFlag(opts.socialLogin);
  let aiProviders: NebutraConfig["aiProviders"];
  let customAiEndpoint: NebutraConfig["customAiEndpoint"];
  let deployTarget: NebutraConfig["deployTarget"];
  let docs: DocsFramework;
  let i18n: boolean;

  if (nonInteractive) {
    region = resolveRegion(opts.region);
    orm = mapOrm(opts.orm);
    database = mapDb(opts.db);
    const rawPayment = hasPayment ? opts.payment : defaultPaymentForRegion(region);
    payment = mapPayment(rawPayment);
    paymentChoice = resolvePaymentChoice(rawPayment);
    auth = resolveAuthChoice(opts.auth);
    aiProviders = mapAi(opts.ai);
    deployTarget = mapDeploy(opts.deploy);
    docs = resolveDocs(opts.docs, useJson);
    i18n = hasI18n ? Boolean(opts.i18n) : true;
  } else {
    // Interactive prompts — only 4 questions: project / region / auth / AI.
    const promptGroup: any = {};

    if (!hasRegion) {
      promptGroup.region = () =>
        p.select({
          message: "Target region?",
          options: [
            { value: "global", label: "global — 海外优先" },
            { value: "cn", label: "cn     — 国内优先" },
            { value: "hybrid", label: "hybrid — 双轨（国内+出海）" },
          ],
          initialValue: "global",
        }) as Promise<unknown>;
    }

    if (!hasAuth) {
      promptGroup.auth = () =>
        p.select({
          message: "Auth provider?",
          options: [
            { value: "clerk", label: "Clerk" },
            { value: "betterauth", label: "Better Auth" },
            { value: "none", label: "None" },
          ],
          initialValue: "clerk",
        }) as Promise<unknown>;
    }

    if (!hasAi) {
      const categories = Array.from(new Set(PROVIDERS.map((p) => p.category)));
      promptGroup.aiCategories = () =>
        p.multiselect({
          message: "Which AI Provider categories do you want to explore? (Select multiple)",
          options: categories.map((c) => ({ value: c, label: c })),
          initialValues: ["直接实验室", "统一网关"],
        });

      promptGroup.aiProviders = ({ results }: any) => {
        const selectedCategories = (results.aiCategories as string[]) || [];
        const filteredProviders = PROVIDERS.filter((p) => selectedCategories.includes(p.category));

        const aiOptions = filteredProviders.map((p) => ({
          value: p.id,
          label: `[${p.category}] ${p.name}`,
        }));
        aiOptions.push({
          value: "custom",
          label: "[自定义] Custom OpenAI-compatible endpoint",
        });

        return p.multiselect({
          message: "Select AI Providers (Space to select, Enter to submit)",
          options: aiOptions,
          initialValues: ["openai", "anthropic"],
          required: false,
        });
      };

      promptGroup.enableCustom = ({ results }: any) => {
        if ((results.aiProviders as string[])?.includes("custom")) {
          return p.confirm({
            message: "Configure custom OpenAI-compatible endpoint?",
            initialValue: true,
          });
        }
        return Promise.resolve(false);
      };

      promptGroup.customAiName = ({ results }: any) => {
        if (results.enableCustom) {
          return p.text({
            message: "Custom endpoint name (e.g. proxy, local):",
            defaultValue: "custom",
            placeholder: "custom",
          });
        }
        return Promise.resolve(undefined);
      };

      promptGroup.customAiBaseUrl = ({ results }: any) => {
        if (results.enableCustom) {
          return p.text({
            message: "Custom endpoint base URL (e.g. https://api.proxy.com/v1):",
            validate: (value) => {
              if (value.length === 0) return "Base URL is required.";
            },
          });
        }
        return Promise.resolve(undefined);
      };

      promptGroup.customAiApiKeyEnv = ({ results }: any) => {
        if (results.enableCustom) {
          return p.text({
            message: "Environment variable name for the API Key:",
            defaultValue: "CUSTOM_AI_API_KEY",
            placeholder: "CUSTOM_AI_API_KEY",
          });
        }
        return Promise.resolve(undefined);
      };
    }

    const answers =
      Object.keys(promptGroup).length > 0
        ? await p.group(promptGroup, {
            onCancel: () => {
              process.stdout.write(pc.red("✘ Cancelled\n"));
              process.exit(130);
            },
          })
        : ({} as Record<string, unknown>);

    region = resolveRegion(
      hasRegion ? opts.region : ((answers as any).region as string | undefined),
    );

    // Everything below is flag-only (no prompt); defaults are region-based.
    orm = mapOrm(opts.orm);
    database = mapDb(opts.db);
    const rawPayment = hasPayment ? opts.payment : defaultPaymentForRegion(region);
    payment = mapPayment(rawPayment);
    paymentChoice = resolvePaymentChoice(rawPayment);
    auth = resolveAuthChoice(hasAuth ? opts.auth : ((answers as any).auth as string | undefined));
    aiProviders = hasAi
      ? mapAi(opts.ai)
      : (((answers as any).aiProviders as string[])?.filter((id) => id !== "custom") ?? []);
    if ((answers as any).enableCustom) {
      customAiEndpoint = {
        name: (answers as any).customAiName,
        baseURL: (answers as any).customAiBaseUrl,
        apiKeyEnvName: (answers as any).customAiApiKeyEnv,
      };
    }
    deployTarget = mapDeploy(opts.deploy);
    docs = resolveDocs(opts.docs, useJson);
    i18n = hasI18n ? Boolean(opts.i18n) : true;
  }

  // Region-based smart defaults for feature flags.
  const rDefaults = regionDefaults(region);
  const email = hasEmail ? (opts.email as string) : rDefaults.email;
  const storage = hasStorage ? (opts.storage as string) : rDefaults.storage;
  const monitoring = hasMonitoring ? (opts.monitoring as string) : rDefaults.monitoring;
  const analytics = hasAnalytics ? (opts.analytics as string) : rDefaults.analytics;
  const sms = hasSms ? (opts.sms as string) : rDefaults.sms;

  // v1.3.1 additions — flags override region defaults.
  const queue = opts.queue ?? rDefaults.queue;
  const search = opts.search ?? rDefaults.search;
  const cache = opts.cache ?? rDefaults.cache;
  const notifications = opts.notifications ?? rDefaults.notifications;
  const webhooks = opts.webhooks ?? rDefaults.webhooks;
  const cms = opts.cms ?? rDefaults.cms;
  const featureFlags = opts.featureFlags ?? rDefaults.featureFlags;
  const captcha = opts.captcha ?? rDefaults.captcha;
  const mcp = opts.mcp ?? rDefaults.mcp;
  const metering = opts.metering ?? rDefaults.metering;
  const billingMode = (opts.billingMode ?? rDefaults.billingMode) as
    | "usage"
    | "seat"
    | "credits";
  const idp = (opts.idp ?? rDefaults.idp) as "clerk" | "oauth-server";

  // Detect any non-stable provider selections so we can warn the user
  // before/after install and emit structured events for --json consumers.
  const previewSelections: PreviewSelection[] = collectPreviewSelections([
    { flag: "queue", provider: queue },
    { flag: "search", provider: search },
    { flag: "notifications", provider: notifications },
    { flag: "webhooks", provider: webhooks },
    { flag: "feature-flags", provider: featureFlags },
    { flag: "captcha", provider: captcha },
  ]);

  function emitPreviewWarnings(): void {
    for (const sel of previewSelections) {
      if (useJson) {
        emitJson(true, {
          event: "warn",
          step: sel.flag,
          provider: sel.provider,
          packageStatus: sel.status,
          message: describeStatus(sel.status),
        });
      } else {
        const badge = formatStatusBadge(sel.status);
        process.stdout.write(
          pc.yellow(`⚠  ${sel.flag}=${sel.provider} ${badge} — ${describeStatus(sel.status)}\n`),
        );
      }
    }
  }

  const config: NebutraConfig = {
    region,
    orm,
    database,
    payment,
    aiProviders,
    customAiEndpoint,
    deployTarget,
    docs,
    i18n,
    email,
    storage,
    monitoring,
    analytics,
    sms,
    queue: queue as NebutraConfig["queue"],
    search: search as NebutraConfig["search"],
    cache: cache as NebutraConfig["cache"],
    notifications: notifications as NebutraConfig["notifications"],
    webhooks: webhooks as NebutraConfig["webhooks"],
    cms: cms as NebutraConfig["cms"],
    featureFlags: featureFlags as NebutraConfig["featureFlags"],
    captcha: captcha as NebutraConfig["captcha"],
    mcp: mcp as NebutraConfig["mcp"],
    metering: metering as NebutraConfig["metering"],
    billingMode,
    idp,
  };

  // Progress summary of selections
  const steps: Array<[string, string]> = [
    ["Project name", projectName],
    ["Region", region],
    ["Auth", auth],
    [
      "Social login",
      socialLoginIds.length > 0
        ? socialLoginIds
            .map((id) => SOCIAL_LOGIN_PROVIDERS.find((p) => p.id === id)?.name ?? id)
            .join(", ")
        : "none",
    ],
    ["ORM", orm],
    ["Database", database],
    ["Payment", paymentChoice],
    [
      "AI",
      Array.isArray(aiProviders)
        ? aiProviders.join(", ") + (customAiEndpoint ? ", custom" : "")
        : String(aiProviders),
    ],
    ["Email", email],
    ["Storage", storage],
    ["Monitoring", monitoring],
    ["Analytics", analytics],
    ["SMS", sms],
    ["Deploy Target", deployTarget],
    ["Docs Framework", docs],
  ];
  if (!useJson) {
    steps.forEach(([label, value], i) => {
      printProgressLine({ index: i + 1, total: steps.length, label, value });
    });
  } else {
    steps.forEach(([label, value], i) => {
      emitJson(true, { event: "step", step: label, value, index: i + 1, total: steps.length });
    });
  }

  const envDefaults = {
    databaseUrl: "postgresql://postgres:postgres@localhost:5432/nebutra",
    clerkPublishable: "",
    clerkSecret: "",
  };

  const startedAt = Date.now();

  // Dry-run: print plan, exit.
  if (isDry) {
    const aiCount = aiProviders.length;
    const plan = [
      `clone template → ${resolvedTarget}`,
      `write nebutra.config.json`,
      `prune template (orm=${orm}, i18n=${i18n})`,
      `region → ${region}`,
      `auth → ${auth === "none" ? "skip (remove packages/auth)" : `configure ${auth}`}`,
      ...(socialLoginIds.length > 0
        ? [
            `social-login → generate ${socialLoginIds.length} callback route${socialLoginIds.length === 1 ? "" : "s"} + SocialLoginButtons.tsx (${socialLoginIds.join(", ")})`,
          ]
        : []),
      `db → ${database === "none" ? "skip (remove packages/db)" : `configure Prisma for ${database}`}`,
      `payment → ${paymentChoice === "none" ? "skip (remove packages/billing)" : `configure ${paymentChoice}`}`,
      ...(docs !== "none"
        ? [
            `docs → scaffold apps/docs (${docs === "fumadocs" ? "fumadocs" : `${docs} → fumadocs fallback`})`,
          ]
        : []),
      ...(aiCount > 0 || customAiEndpoint
        ? [
            `ai-providers → generate registry.ts + env (${aiCount}${customAiEndpoint ? " + custom" : ""} provider${aiCount === 1 && !customAiEndpoint ? "" : "s"})`,
          ]
        : []),
      ...(email !== "none" ? [`email → configure ${email}`] : []),
      ...(storage !== "none" ? [`storage → configure ${storage}`] : []),
      ...(monitoring !== "none" ? [`monitoring → configure ${monitoring}`] : []),
      ...(analytics !== "none" ? [`analytics → configure ${analytics}`] : []),
      ...(sms !== "none" ? [`sms → configure ${sms}`] : []),
      ...(queue !== "none" ? [`queue → configure ${queue}`] : []),
      ...(search !== "none" ? [`search → configure ${search}`] : []),
      ...(cache !== "none" ? [`cache → configure ${cache}`] : []),
      ...(notifications !== "none" ? [`notifications → configure ${notifications}`] : []),
      ...(webhooks !== "none" ? [`webhooks → configure ${webhooks}`] : []),
      ...(cms !== "none" ? [`cms → configure ${cms}`] : []),
      ...(featureFlags !== "none" ? [`feature-flags → configure ${featureFlags}`] : []),
      ...(captcha !== "none" ? [`captcha → configure ${captcha}`] : []),
      `mcp → ${mcp === "on" ? "enable MCP server" : "remove packages/mcp"}`,
      `metering → ${metering === "off" ? "disabled" : metering === "auto" ? (payment !== "none" ? "enabled (auto: payment set)" : "disabled (auto: no payment)") : "enabled"}`,
      ...(billingMode !== "usage" ? [`billing-mode → ${billingMode}`] : []),
      ...(idp !== "clerk" ? [`idp → ${idp}`] : []),
      `compliance → inject ${region} boilerplate (ICP/Cookie/AIGC/Privacy)`,
      `welcome → generate dev welcome page`,
      `env → generate random secrets (AUTH_SECRET, JWT_SECRET)`,
      `seed → generate prisma/seed.ts (1 admin + 3 tenants)`,
      ...(deployTarget !== "none" ? [`deploy → inject ${deployTarget} config`] : []),
      `inject .env.local`,
      opts.install === false ? "skip install" : `run ${resolvedPm} install`,
      opts.git === false ? "skip git init" : "run git init",
    ];
    if (useJson) {
      plan.forEach((p) => emitJson(true, { event: "plan", action: p }));
      emitPreviewWarnings();
      emitJson(true, { event: "done", dryRun: true });
    } else {
      process.stdout.write("\n" + pc.bold("Dry run — planned actions:\n"));
      for (const line of plan) process.stdout.write(`  • ${line}\n`);
      if (previewSelections.length > 0) {
        process.stdout.write("\n" + pc.bold(pc.yellow("Preview-status providers selected:\n")));
        emitPreviewWarnings();
      }
      process.stdout.write(pc.dim("\nNo files were written.\n"));
    }
    process.exit(0);
  }

  // SIGINT handler — offer to clean partial target (L2 — ask).
  const onInterrupt = async () => {
    process.stdout.write("\n" + pc.red("✘ Cancelled\n"));
    if (fs.existsSync(resolvedTarget)) {
      const cleanup = await p.confirm({
        message: `Cleanup partial install at ${resolvedTarget}?`,
        initialValue: true,
      });
      if (cleanup === true) {
        fs.rmSync(resolvedTarget, { recursive: true, force: true });
        process.stdout.write(pc.dim(`  ✓ Removed ${resolvedTarget}\n`));
      }
    }
    process.exit(130);
  };
  process.on("SIGINT", onInterrupt);

  try {
    emitJson(useJson, { event: "step", step: "clone", status: "start" });
    await cloneTemplate(resolvedTarget);
    emitJson(useJson, { event: "step", step: "clone", status: "ok" });

    emitJson(useJson, { event: "step", step: "package", status: "start" });
    await updatePackageJson(resolvedTarget, projectName);
    emitJson(useJson, { event: "step", step: "package", status: "ok" });

    emitJson(useJson, { event: "step", step: "config", status: "start" });
    await writeNebutraConfig(resolvedTarget, config);
    emitJson(useJson, { event: "step", step: "config", status: "ok" });

    emitJson(useJson, { event: "step", step: "prune", status: "start" });
    await pruneTemplate(resolvedTarget, config);
    emitJson(useJson, { event: "step", step: "prune", status: "ok" });

    // Schema-level conditional pruning — strips /// @conditional(flag=values)
    // model blocks from the scaffolded project's prisma schema based on the
    // CLI flag selection. See packages/create-sailor/src/utils/prune-schema.ts.
    const schemaPath = path.join(resolvedTarget, "packages/db/prisma/schema.prisma");
    if (fs.existsSync(schemaPath)) {
      emitJson(useJson, { event: "step", step: "schema-prune", status: "start" });
      try {
        const raw = fs.readFileSync(schemaPath, "utf-8");
        const pruned = pruneSchemaByFlags(raw, {
          auth,
          payment: paymentChoice,
          "billing-mode": billingMode,
          idp,
          template: "saas", // TODO: wire up once --template flag returns
          // community: intentionally not a template flag — Sleptons is Nebutra's own
          // product, stripped from Sailor-Template at mirror-sync time.
        });
        fs.writeFileSync(schemaPath, pruned);
        emitJson(useJson, { event: "step", step: "schema-prune", status: "ok" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitJson(useJson, { event: "step", step: "schema-prune", status: "error", error: msg });
        // Non-fatal — the schema stays as-is; user can manually trim later.
      }
    } else {
      emitJson(useJson, { event: "step", step: "schema-prune", status: "skip" });
    }

    emitJson(useJson, { event: "step", step: "auth", choice: auth, status: "start" });
    await applyAuthSelection(resolvedTarget, auth);
    emitJson(useJson, { event: "step", step: "auth", choice: auth, status: "ok" });

    if (socialLoginIds.length > 0) {
      emitJson(useJson, {
        event: "step",
        step: "social-login",
        providers: socialLoginIds,
        status: "start",
      });
      await applySocialLoginProviders(resolvedTarget, socialLoginIds, auth);
      emitJson(useJson, {
        event: "step",
        step: "social-login",
        providers: socialLoginIds,
        status: "ok",
      });
    } else {
      emitJson(useJson, { event: "step", step: "social-login", status: "skip" });
    }

    emitJson(useJson, { event: "step", step: "db", choice: database, status: "start" });
    await applyDatabaseSelection(resolvedTarget, database, projectName);
    emitJson(useJson, { event: "step", step: "db", choice: database, status: "ok" });

    emitJson(useJson, {
      event: "step",
      step: "payment",
      choice: paymentChoice,
      status: "start",
    });
    await applyPaymentSelection(resolvedTarget, paymentChoice);
    emitJson(useJson, {
      event: "step",
      step: "payment",
      choice: paymentChoice,
      status: "ok",
    });

    // Region-aware feature selections.
    await applyEmailSelection(resolvedTarget, email, region);
    if (useJson) emitJson(true, { event: "step", step: "email", choice: email, status: "ok" });

    await applyStorageSelection(resolvedTarget, storage, region);
    if (useJson) emitJson(true, { event: "step", step: "storage", choice: storage, status: "ok" });

    await applyMonitoringSelection(resolvedTarget, monitoring, region);
    if (useJson)
      emitJson(true, {
        event: "step",
        step: "monitoring",
        choice: monitoring,
        status: "ok",
      });

    await applyAnalyticsSelection(resolvedTarget, analytics, region);
    if (useJson)
      emitJson(true, {
        event: "step",
        step: "analytics",
        choice: analytics,
        status: "ok",
      });

    await applySmsSelection(resolvedTarget, sms, region);
    if (useJson) emitJson(true, { event: "step", step: "sms", choice: sms, status: "ok" });

    await applyQueueSelection(resolvedTarget, queue, region);
    if (useJson) emitJson(true, { event: "step", step: "queue", choice: queue, status: "ok" });

    await applySearchSelection(resolvedTarget, search, region);
    if (useJson) emitJson(true, { event: "step", step: "search", choice: search, status: "ok" });

    await applyCacheSelection(resolvedTarget, cache, region);
    if (useJson) emitJson(true, { event: "step", step: "cache", choice: cache, status: "ok" });

    await applyNotificationsSelection(resolvedTarget, notifications, region);
    if (useJson)
      emitJson(true, { event: "step", step: "notifications", choice: notifications, status: "ok" });

    await applyWebhooksSelection(resolvedTarget, webhooks, region);
    if (useJson)
      emitJson(true, { event: "step", step: "webhooks", choice: webhooks, status: "ok" });

    await applyCmsSelection(resolvedTarget, cms, region);
    if (useJson) emitJson(true, { event: "step", step: "cms", choice: cms, status: "ok" });

    await applyFeatureFlagsSelection(resolvedTarget, featureFlags, region);
    if (useJson)
      emitJson(true, { event: "step", step: "feature-flags", choice: featureFlags, status: "ok" });

    await applyCaptchaSelection(resolvedTarget, captcha, region);
    if (useJson) emitJson(true, { event: "step", step: "captcha", choice: captcha, status: "ok" });

    await applyMcpSwitch(resolvedTarget, mcp);
    if (useJson) emitJson(true, { event: "step", step: "mcp", mode: mcp, status: "ok" });

    await applyMeteringSwitch(resolvedTarget, metering, payment);
    if (useJson) emitJson(true, { event: "step", step: "metering", mode: metering, status: "ok" });

    // Schema prune — strip @conditional model blocks that don't match the selection.
    // Covers: auth, payment, billing-mode, idp, template.
    // (community flag was removed — Sleptons is Nebutra's own product, not a template
    // choice. Sleptons models are stripped at mirror-sync time by template-build.ts.)
    if (config.orm === "prisma" && config.database !== "none") {
      const schemaPath = path.join(resolvedTarget, "packages/db/prisma/schema.prisma");
      if (fs.existsSync(schemaPath)) {
        emitJson(useJson, { event: "step", step: "schema-prune", status: "start" });
        try {
          const raw = fs.readFileSync(schemaPath, "utf8");
          const pruned = pruneSchemaByFlags(raw, {
            auth,
            payment: paymentChoice,
            "billing-mode": billingMode,
            idp,
            template: "saas",
          });
          fs.writeFileSync(schemaPath, pruned);
          emitJson(useJson, { event: "step", step: "schema-prune", status: "ok" });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          emitJson(useJson, { event: "step", step: "schema-prune", status: "error", error: msg });
        }
      } else {
        emitJson(useJson, { event: "step", step: "schema-prune", status: "skip" });
      }
    } else {
      emitJson(useJson, { event: "step", step: "schema-prune", status: "skip" });
    }

    // JSON events for flags whose "apply" effect is the schema prune above.
    emitJson(useJson, {
      event: "step",
      step: "billing-mode",
      choice: billingMode,
      status: "ok",
    });
    emitJson(useJson, { event: "step", step: "idp", choice: idp, status: "ok" });

    await applyComplianceTemplates(resolvedTarget, region);
    if (useJson) emitJson(true, { event: "step", step: "compliance", region, status: "ok" });

    await generateEnvSecrets(resolvedTarget);
    await generateSeedData(resolvedTarget, auth);
    await generateWelcomePage(resolvedTarget, { projectName, region });

    emitJson(useJson, { event: "step", step: "ai-providers", status: "start" });
    const selection = { providerIds: config.aiProviders, customEndpoint: config.customAiEndpoint };
    // Hardcode templateDir to the cloned repo's packages/ai-providers/templates
    const templateDir = path.join(resolvedTarget, "packages/ai-providers/templates");
    await applyProviderSelection(resolvedTarget, selection, templateDir);
    emitJson(useJson, { event: "step", step: "ai-providers", status: "ok" });

    emitJson(useJson, { event: "step", step: "docs", status: "start" });
    if (docs !== "none") {
      await applyDocsTemplate(resolvedTarget, {
        framework: docs,
        projectName,
      });
      emitJson(useJson, {
        event: "step",
        step: "docs",
        framework: docs === "fumadocs" ? "fumadocs" : "fumadocs",
        requested: docs,
        status: "ok",
      });
    } else {
      emitJson(useJson, { event: "step", step: "docs", status: "skip" });
    }

    emitJson(useJson, { event: "step", step: "deploy-target", status: "start" });
    if (deployTarget !== "none") {
      await applyDeployTarget(resolvedTarget, deployTarget);
    }
    emitJson(useJson, { event: "step", step: "deploy-target", status: "ok" });

    emitJson(useJson, { event: "step", step: "env", status: "start" });
    await injectEnv(resolvedTarget, envDefaults);
    emitJson(useJson, { event: "step", step: "env", status: "ok" });

    // Install dependencies (non-fatal on failure).
    const shouldInstall = opts.install !== false;
    if (shouldInstall) {
      const installCmd = resolvedPm === "bun" ? "bun install" : `${resolvedPm} install`;
      if (useJson) {
        emitJson(true, { event: "step", step: "install", pm: resolvedPm, status: "start" });
      } else {
        process.stdout.write(pc.dim(`  Installing dependencies with ${resolvedPm}…\n`));
      }
      try {
        execSync(installCmd, {
          cwd: resolvedTarget,
          stdio: useJson ? "ignore" : "inherit",
        });
        emitJson(useJson, { event: "step", step: "install", status: "ok" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (useJson) {
          emitJson(true, { event: "step", step: "install", status: "error", error: msg });
        } else {
          process.stdout.write(pc.yellow(`  ⚠ install failed — run '${installCmd}' manually.\n`));
        }
        // Non-fatal — project was still scaffolded.
      }
    } else {
      emitJson(useJson, { event: "step", step: "install", status: "skip" });
    }

    // Initialise git repo + initial commit (non-fatal on failure).
    const shouldGit = opts.git !== false;
    if (shouldGit) {
      if (useJson) {
        emitJson(true, { event: "step", step: "git-init", status: "start" });
      }
      try {
        execSync("git init -q", { cwd: resolvedTarget, stdio: "ignore" });
        execSync("git add -A", { cwd: resolvedTarget, stdio: "ignore" });
        execSync(
          'git -c user.email=you@example.com -c user.name="You" commit -q -m "chore: initial scaffold from create-sailor"',
          { cwd: resolvedTarget, stdio: "ignore" },
        );
        emitJson(useJson, { event: "step", step: "git-init", status: "ok" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (useJson) {
          emitJson(true, { event: "step", step: "git-init", status: "error", error: msg });
        } else {
          process.stdout.write(pc.yellow(`  ⚠ git init skipped — not fatal.\n`));
        }
        // Non-fatal — user can init git manually.
      }
    } else {
      emitJson(useJson, { event: "step", step: "git-init", status: "skip" });
    }

    const elapsedSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));

    // Phase 0 telemetry — fire-and-forget. Respects NEBUTRA_TELEMETRY=0.
    emitScaffoldCompleted({
      template_version: VERSION,
      package_manager: resolvedPm,
      region,
      auth,
      payment: paymentChoice,
      ai_providers: aiProviders,
      deploy_target: deployTarget,
      duration_ms: Date.now() - startedAt,
    });

    // Surface preview-status warnings before declaring success so the
    // user doesn't miss them in install/git noise above.
    if (previewSelections.length > 0) {
      emitPreviewWarnings();
    }

    if (useJson) {
      emitJson(true, {
        event: "done",
        status: "ok",
        elapsedSec,
        targetDir: resolvedTarget,
        previewSelections,
      });
    } else {
      showDone({
        elapsedSec,
        targetDir: resolvedTarget,
        skippedInstall: opts.install === false,
        previewSelections,
      });
    }

    // Update notifier (non-blocking)
    try {
      updateNotifier({
        pkg: { name: PKG_NAME, version: VERSION },
        updateCheckInterval: 1000 * 60 * 60 * 24,
      }).notify({ defer: false, isGlobal: true });
    } catch {
      // swallow — non-critical
    }

    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (useJson) {
      emitJson(true, { event: "error", message });
    } else {
      process.stdout.write(pc.red(`\n✘ Failed: ${message}\n`));
    }
    process.exit(1);
  }
}

run().catch((err) => {
  process.stderr.write(String(err) + "\n");
  process.exit(1);
});
