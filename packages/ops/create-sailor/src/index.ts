#!/usr/bin/env node

/**
 * create-sailor — CLI entry point.
 *
 * Responsibilities:
 *   1. Commander registration (via buildProgram)
 *   2. Input validation / pre-checks (pnpm, --help, --dry-run)
 *   3. Project-name prompt (the one TTY prompt outside the wizard)
 *   4. Config resolution (interactive or non-interactive)
 *   5. Progress summary table
 *   6. Scaffold execution
 *
 * All domain logic lives in src/steps/*.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { buildProgram } from "./steps/cli-setup";
import { detectPm } from "./steps/mappers";
import { resolveConfig } from "./steps/resolve-config";
import { runScaffold } from "./steps/scaffold";
import type { CliOptions, JsonEvent } from "./steps/types";
import { showBanner } from "./ui/banner";
import { showHelp } from "./ui/help";
import { printProgressLine } from "./ui/progress";
import { SOCIAL_LOGIN_PROVIDERS } from "./utils/auth-social";
import { maybeShowFirstRunBanner } from "./utils/first-run";
import { VERSION } from "./version";

// ---------------------------------------------------------------------------
// JSON event helper
// ---------------------------------------------------------------------------

function emitJson(useJson: boolean, payload: JsonEvent): void {
  if (useJson) process.stdout.write(JSON.stringify(payload) + "\n");
}

// ---------------------------------------------------------------------------
// Dry-run plan printer
// ---------------------------------------------------------------------------

function printDryRunPlan(
  useJson: boolean,
  resolved: Awaited<ReturnType<typeof resolveConfig>>,
  resolvedTarget: string,
  resolvedPm: string,
  opts: CliOptions,
): void {
  const {
    region,
    orm,
    database,
    paymentChoice,
    docs,
    socialLoginIds,
    aiMode,
    aiProviders,
    customAiEndpoint,
    deployTarget,
    metering,
    payment,
    billingMode,
    idp,
    mcp,
    waveToggles,
    previewSelections,
  } = resolved;

  const {
    email,
    storage,
    monitoring,
    analytics,
    sms,
    queue,
    search,
    cache,
    notifications,
    webhooks,
    cms,
    featureFlags,
    captcha,
  } = resolved;

  const aiCount = aiProviders.length;
  const plan = [
    `clone template → ${resolvedTarget}`,
    `write nebutra.config.json`,
    `governance-lints → write governance.config.json + wire pnpm lint (no-raw-inputs${database !== "none" ? " + repository-seam" : ""})`,
    `prune template (orm=${orm}, i18n=${resolved.i18n})`,
    `region → ${region}`,
    `auth → ${resolved.auth === "none" ? "skip (remove packages/auth)" : `configure ${resolved.auth}`}`,
    ...(socialLoginIds.length > 0
      ? [
          `social-login → generate ${socialLoginIds.length} callback route${socialLoginIds.length === 1 ? "" : "s"} + SocialLoginButtons.tsx (${socialLoginIds.join(", ")})`,
        ]
      : []),
    `db → ${database === "none" ? "skip (remove packages/db)" : `configure Prisma for ${database}`}`,
    ...(database !== "none" ? [`db-host → configure ${resolved.databaseHost}`] : []),
    `payment → ${paymentChoice === "none" ? "skip (remove packages/billing)" : `configure ${paymentChoice}`}`,
    ...(docs !== "none"
      ? [
          `docs → scaffold apps/docs (${docs === "fumadocs" ? "fumadocs" : `${docs} → fumadocs fallback`})`,
        ]
      : []),
    ...(aiCount > 0 || customAiEndpoint
      ? [
          `ai-providers → generate ${aiMode} registry seed + env (${aiCount}${customAiEndpoint ? " + custom" : ""} provider${aiCount === 1 && !customAiEndpoint ? "" : "s"})`,
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
    `cron-jobs → ${waveToggles.cronJobs ? "enabled" : "disabled"}`,
    `audit-log → ${waveToggles.auditLog ? "enabled" : "disabled"}`,
    `api-keys → ${waveToggles.apiKeys ? "enabled" : "disabled"}`,
    `command-palette → ${waveToggles.commandPalette ? "enabled" : "disabled"}`,
    `cookie-consent → ${waveToggles.cookieConsent ? "enabled" : "disabled"}`,
    `legal-pages → ${waveToggles.legalPages ? "enabled" : "disabled"}`,
    `china-compliance → ${waveToggles.chinaCompliance ? "enabled (@nebutra/china-compliance + ICP footer)" : "disabled"}`,
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
    for (const action of plan) emitJson(true, { event: "plan", action });
    for (const sel of previewSelections) {
      emitJson(true, {
        event: "warn",
        step: sel.flag,
        provider: sel.provider,
        packageStatus: sel.status,
      });
    }
    emitJson(true, { event: "done", dryRun: true });
  } else {
    process.stdout.write("\n" + pc.bold("Dry run — planned actions:\n"));
    for (const line of plan) process.stdout.write(`  • ${line}\n`);
    if (previewSelections.length > 0) {
      process.stdout.write("\n" + pc.bold(pc.yellow("Preview-status providers selected:\n")));
      for (const sel of previewSelections) {
        process.stdout.write(pc.yellow(`⚠  ${sel.flag}=${sel.provider}\n`));
      }
    }
    process.stdout.write(pc.dim("\nNo files were written.\n"));
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  const program = buildProgram();
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

  if (!useJson) {
    // Show telemetry opt-out banner once per machine (no-op on subsequent
    // runs because of the shared ~/.config/nebutra/first-run-acked marker).
    maybeShowFirstRunBanner();
    showBanner();
  }
  emitJson(useJson, { event: "start", version: VERSION });

  // Pre-check: the scaffolded project uses pnpm workspaces + Turborepo and
  // assumes pnpm 10+. Fail loud now so users don't get a half-installed
  // project. Override with `--pm npm` only if you know the workspace deps
  // won't resolve.
  if (!opts.pm) {
    try {
      execSync("pnpm --version", { stdio: "ignore" });
    } catch {
      if (!useJson) {
        process.stderr.write(
          `\n${pc.red("✘")} ${pc.bold("pnpm is required")} but was not found on PATH.\n` +
            `\nThe scaffold uses pnpm workspaces + Turborepo. Install pnpm first:\n` +
            `  ${pc.cyan("npm i -g pnpm@10")}\n` +
            `\nThen retry: ${pc.cyan("pnpm dlx create-sailor@latest")}\n` +
            `(or pass ${pc.dim("--pm=npm")} if you know workspace:* won't resolve in your setup)\n\n`,
        );
      }
      emitJson(useJson, { event: "error", code: "PNPM_MISSING" });
      process.exit(1);
    }
  }

  // ---- Project-name resolution ----
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
                if (!value?.length) return "Please enter a path.";
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
  const resolvedPm = opts.pm ?? detectPm();

  // ---- Config resolution (interactive or non-interactive) ----
  const resolved = await resolveConfig(opts, useJson);

  // ---- Progress summary table ----
  const steps: Array<[string, string]> = [
    ["Project name", projectName],
    ["Region", resolved.region],
    ["Auth", resolved.auth],
    [
      "Social login",
      resolved.socialLoginIds.length > 0
        ? resolved.socialLoginIds
            .map((id) => SOCIAL_LOGIN_PROVIDERS.find((p) => p.id === id)?.name ?? id)
            .join(", ")
        : "none",
    ],
    ["ORM", resolved.orm],
    ["Database", resolved.database],
    ["Database Host", resolved.databaseHost],
    ["Payment", resolved.paymentChoice],
    [
      "AI topology",
      `${resolved.aiMode}${resolved.aiProviders.length > 0 ? ` (${resolved.aiProviders.join(", ")} seed)` : ""}${
        resolved.customAiEndpoint ? " + custom endpoint" : ""
      }`,
    ],
    ["Email", resolved.email],
    ["Storage", resolved.storage],
    ["Monitoring", resolved.monitoring],
    ["Analytics", resolved.analytics],
    ["SMS", resolved.sms],
    ["Deploy Target", resolved.deployTarget],
    ["Docs Framework", resolved.docs],
    ["Access gate", resolved.accessGate],
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

  // ---- Dry run ----
  if (isDry) {
    printDryRunPlan(useJson, resolved, resolvedTarget, resolvedPm, opts);
    process.exit(0);
  }

  // ---- SIGINT handler ----
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

  // ---- Scaffold execution ----
  try {
    await runScaffold({
      resolvedTarget,
      projectName,
      resolvedPm,
      opts,
      useJson,
      resolved,
      startedAt: Date.now(),
    });
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
