#!/usr/bin/env node

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
import {
  type CustomEndpoint,
  type DocsFramework,
  type NebutraConfig,
  writeNebutraConfig,
} from "./utils/config.js";
import { applyDeployTarget } from "./utils/deploy.js";
import { applyDocsTemplate } from "./utils/docs.js";
import { injectEnv } from "./utils/env.js";
import { cloneTemplate } from "./utils/git.js";
import { updatePackageJson } from "./utils/npm.js";
import { applyProviderSelection } from "./utils/providers.js";
import { pruneTemplate } from "./utils/prune.js";

const VERSION = "1.0.0";
const PKG_NAME = "create-sailor";

interface CliOptions {
  pm?: string;
  orm?: string;
  db?: string;
  auth?: string;
  payment?: string;
  ai?: string;
  deploy?: string;
  docs?: string;
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

async function run(): Promise<void> {
  const program = new Command();
  program
    .name(PKG_NAME)
    .description("Nebutra-Sailor — AI-Native SaaS template")
    .version(VERSION, "-v, --version")
    .helpOption(false) // we render our own help
    .argument("[name]", "project directory", undefined)
    .option("-p, --pm <id>", "npm | pnpm | yarn | bun")
    .option("--orm <id>", "prisma | drizzle | none")
    .option("--db <id>", "postgres | mysql | sqlite | none")
    .option("--auth <id>", "clerk | betterauth | none")
    .option("--payment <id>", "stripe | lemon | wechat | alipay | none")
    .option("--ai <ids>", "comma-separated provider ids")
    .option("--deploy <target>", "vercel | railway | cloudflare | selfhost")
    .option("--docs <id>", "fumadocs | mintlify | docusaurus | nextra | vitepress | none")
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
  const hasOrm = !!opts.orm;
  const hasDb = !!opts.db;
  const hasPayment = !!opts.payment;
  const hasAi = !!opts.ai;
  const hasDeploy = !!opts.deploy;
  const hasDocs = !!opts.docs;
  const hasI18n = opts.i18n !== undefined;

  let orm: NebutraConfig["orm"];
  let database: NebutraConfig["database"];
  let payment: NebutraConfig["payment"];
  let aiProviders: NebutraConfig["aiProviders"];
  let customAiEndpoint: NebutraConfig["customAiEndpoint"];
  let deployTarget: NebutraConfig["deployTarget"];
  let docs: DocsFramework;
  let i18n: boolean;

  if (nonInteractive) {
    orm = mapOrm(opts.orm);
    database = mapDb(opts.db);
    payment = mapPayment(opts.payment);
    aiProviders = mapAi(opts.ai);
    deployTarget = mapDeploy(opts.deploy);
    docs = resolveDocs(opts.docs, useJson);
    i18n = hasI18n ? Boolean(opts.i18n) : true;
  } else {
    const promptGroup: any = {};
    if (!hasOrm) {
      promptGroup.orm = () =>
        p.select({
          message: "Which ORM?",
          options: [
            { value: "prisma", label: "Prisma" },
            { value: "drizzle", label: "Drizzle" },
            { value: "none", label: "None" },
          ],
          initialValue: "prisma",
        }) as Promise<unknown>;
    }
    if (!hasDb) {
      promptGroup.database = () =>
        p.select({
          message: "Database?",
          options: [
            { value: "postgresql", label: "PostgreSQL" },
            { value: "mysql", label: "MySQL" },
            { value: "sqlite", label: "SQLite" },
            { value: "none", label: "None" },
          ],
          initialValue: "postgresql",
        }) as Promise<unknown>;
    }
    if (!hasPayment) {
      promptGroup.payment = () =>
        p.select({
          message: "Payment?",
          options: [
            { value: "stripe", label: "Stripe" },
            { value: "lemonsqueezy", label: "Lemon Squeezy" },
            { value: "none", label: "None" },
          ],
          initialValue: "stripe",
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

    if (!hasDeploy) {
      promptGroup.deployTarget = () =>
        p.select({
          message: "Where will you deploy?",
          options: [
            { value: "vercel", label: "Vercel" },
            { value: "railway", label: "Railway" },
            { value: "cloudflare", label: "Cloudflare Workers" },
            { value: "selfhost", label: "Self-host / Docker" },
            { value: "none", label: "None for now" },
          ],
          initialValue: "vercel",
        }) as Promise<unknown>;
    }

    if (!hasDocs) {
      promptGroup.docs = () =>
        p.select({
          message: "What documentation framework? (affects `apps/docs`)",
          options: [
            { value: "fumadocs", label: "Fumadocs     — Next.js monorepo native (Recommended)" },
            { value: "mintlify", label: "Mintlify     — managed docs SaaS (Coming in v1.2)" },
            { value: "docusaurus", label: "Docusaurus   — Meta's framework (Coming in v1.2)" },
            { value: "nextra", label: "Nextra       — Next.js minimal (Coming in v1.2)" },
            {
              value: "vitepress",
              label: "VitePress    — Vue ecosystem, separate repo (Experimental)",
            },
            { value: "none", label: "None         — skip docs" },
          ],
          initialValue: "fumadocs",
        }) as Promise<unknown>;
    }

    if (!hasI18n) {
      promptGroup.i18n = () =>
        p.confirm({ message: "Enable i18n?", initialValue: true }) as Promise<unknown>;
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

    orm = hasOrm ? mapOrm(opts.orm) : ((answers as any).orm as NebutraConfig["orm"]);
    database = hasDb ? mapDb(opts.db) : ((answers as any).database as NebutraConfig["database"]);
    payment = hasPayment
      ? mapPayment(opts.payment)
      : ((answers as any).payment as NebutraConfig["payment"]);
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
    deployTarget = hasDeploy
      ? mapDeploy(opts.deploy)
      : ((answers as any).deployTarget as NebutraConfig["deployTarget"]);
    docs = resolveDocs(
      hasDocs ? opts.docs : ((answers as any).docs as string | undefined),
      useJson,
    );
    i18n = hasI18n ? Boolean(opts.i18n) : Boolean((answers as any).i18n);
  }

  const config: NebutraConfig = {
    orm,
    database,
    payment,
    aiProviders,
    customAiEndpoint,
    deployTarget,
    docs,
    i18n,
  };

  // Progress summary of selections
  const steps: Array<[string, string]> = [
    ["Project name", projectName],
    ["ORM", orm],
    ["Database", database],
    ["Payment", payment],
    [
      "AI",
      Array.isArray(aiProviders)
        ? aiProviders.join(", ") + (customAiEndpoint ? ", custom" : "")
        : String(aiProviders),
    ],
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
    const plan = [
      `clone template → ${resolvedTarget}`,
      `write nebutra.config.json`,
      `prune template (orm=${orm}, i18n=${i18n})`,
      ...(docs !== "none"
        ? [
            `docs → scaffold apps/docs (${docs === "fumadocs" ? "fumadocs" : `${docs} → fumadocs fallback`})`,
          ]
        : []),
      `inject .env.local`,
      opts.install === false ? "skip install" : `run ${resolvedPm} install`,
      opts.git === false ? "skip git init" : "run git init",
    ];
    if (useJson) {
      plan.forEach((p) => emitJson(true, { event: "plan", action: p }));
      emitJson(true, { event: "done", dryRun: true });
    } else {
      process.stdout.write("\n" + pc.bold("Dry run — planned actions:\n"));
      for (const line of plan) process.stdout.write(`  • ${line}\n`);
      process.stdout.write(pc.dim("\nNo files were written.\n"));
    }
    process.exit(0);
  }

  // SIGINT handler — offer to clean partial target
  const onInterrupt = () => {
    process.stdout.write("\n" + pc.red("✘ Cancelled\n"));
    try {
      if (fs.existsSync(resolvedTarget)) {
        // Only remove if we created it during this session (empty or partial)
        // Be conservative — do not remove without explicit flag. Warn user.
        process.stdout.write(
          pc.dim(`  Partial directory left at ${resolvedTarget} — remove manually if needed.\n`),
        );
      }
    } catch {
      // swallow
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

    const elapsedSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));

    if (useJson) {
      emitJson(true, {
        event: "done",
        status: "ok",
        elapsedSec,
        targetDir: resolvedTarget,
      });
    } else {
      showDone({
        elapsedSec,
        targetDir: resolvedTarget,
        skippedInstall: opts.install === false,
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
