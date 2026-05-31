/**
 * Scaffold execution — runs all wizard steps in order after config is resolved.
 *
 * Receives a fully-resolved ResolvedConfig + runtime context (resolvedTarget,
 * projectName, opts, useJson) and executes every apply/generate call,
 * emitting JSON events or human-readable output along the way.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";
import updateNotifier from "update-notifier";
import { showDone } from "../ui/done";
import { applyAnalyticsSelection } from "../utils/analytics";
import { emitScaffoldCompleted } from "../utils/analytics-emit";
import { applyAuthSelection } from "../utils/auth";
import { applySocialLoginProviders } from "../utils/auth-social-apply";
import { applyCacheSelection } from "../utils/cache";
import { applyCaptchaSelection } from "../utils/captcha";
import { applyCmsSelection } from "../utils/cms";
import { applyComplianceTemplates } from "../utils/compliance";
import { writeNebutraConfig } from "../utils/config";
import { applyDatabaseHostSelection, applyDatabaseSelection } from "../utils/database";
import { getDatabaseHost } from "../utils/database-host-meta";
import { applyDeployTarget } from "../utils/deploy";
import { applyDocsTemplate } from "../utils/docs";
import { applyEmailSelection } from "../utils/email";
import { injectEnv } from "../utils/env";
import { generateEnvSecrets } from "../utils/env-secrets";
import { applyFeatureFlagsSelection } from "../utils/feature-flags";
import { cloneTemplate } from "../utils/git";
import { emitIndependentLicense } from "../utils/license-emit";
import { applyMcpSwitch } from "../utils/mcp";
import { applyMeteringSwitch } from "../utils/metering";
import { applyMonitoringSelection } from "../utils/monitoring";
import { applyNotificationsSelection } from "../utils/notifications";
import { updatePackageJson } from "../utils/npm";
import { applyOrmSelection } from "../utils/orm";
import { describeStatus, formatStatusBadge } from "../utils/package-status";
import { applyPaymentSelection } from "../utils/payment";
import { applyProviderSelection } from "../utils/providers";
import { pruneTemplate, pruneWaveFeatures } from "../utils/prune";
import { pruneMigrationsByFlags } from "../utils/prune-migrations";
import { pruneSchemaByFlags } from "../utils/prune-schema";
import { applyQueueSelection } from "../utils/queue";
import { applyScaffoldExtras } from "../utils/scaffold-extras";
import { applySearchSelection } from "../utils/search";
import { generateSeedData } from "../utils/seed";
import { applySmsSelection } from "../utils/sms";
import { applyStorageSelection } from "../utils/storage";
import { applyWebhooksSelection } from "../utils/webhooks";
import { generateWelcomePage } from "../utils/welcome";
import { VERSION } from "../version";
import type { ResolvedConfig } from "./resolve-config";
import type { CliOptions, JsonEvent } from "./types";

// ---------------------------------------------------------------------------
// JSON event helper (local to scaffold — same logic as original index.ts)
// ---------------------------------------------------------------------------

function emitJson(useJson: boolean, payload: JsonEvent): void {
  if (useJson) process.stdout.write(JSON.stringify(payload) + "\n");
}

function isMissingFileError(err: unknown): boolean {
  return (
    err !== null &&
    typeof err === "object" &&
    "code" in err &&
    (err as NodeJS.ErrnoException).code === "ENOENT"
  );
}

// ---------------------------------------------------------------------------
// Preview warnings
// ---------------------------------------------------------------------------

function emitPreviewWarnings(
  useJson: boolean,
  previewSelections: ResolvedConfig["previewSelections"],
): void {
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

// ---------------------------------------------------------------------------
// Schema-level conditional pruning (shared logic, called in two places)
// ---------------------------------------------------------------------------

function runSchemaPrune(
  useJson: boolean,
  resolvedTarget: string,
  schemaFlags: Record<string, string>,
): void {
  const schemaPath = path.join(resolvedTarget, "packages/platform/db/prisma/schema.prisma");
  let raw: string;
  try {
    raw = fs.readFileSync(schemaPath, "utf8");
  } catch (err) {
    if (isMissingFileError(err)) {
      emitJson(useJson, { event: "step", step: "schema-prune", status: "skip" });
      return;
    }
    const msg = err instanceof Error ? err.message : String(err);
    emitJson(useJson, { event: "step", step: "schema-prune", status: "error", error: msg });
    return;
  }

  emitJson(useJson, { event: "step", step: "schema-prune", status: "start" });
  try {
    const pruned = pruneSchemaByFlags(raw, schemaFlags);
    fs.writeFileSync(schemaPath, pruned);
    pruneMigrationsByFlags(path.join(path.dirname(schemaPath), "migrations"), schemaFlags);
    emitJson(useJson, { event: "step", step: "schema-prune", status: "ok" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emitJson(useJson, { event: "step", step: "schema-prune", status: "error", error: msg });
    // Non-fatal — the schema stays as-is; user can manually trim later.
  }
}

// ---------------------------------------------------------------------------
// runScaffold — exported main entry
// ---------------------------------------------------------------------------

export interface ScaffoldContext {
  resolvedTarget: string;
  projectName: string;
  resolvedPm: string;
  opts: CliOptions;
  useJson: boolean;
  resolved: ResolvedConfig;
  startedAt: number;
}

export async function runScaffold(ctx: ScaffoldContext): Promise<void> {
  const { resolvedTarget, projectName, resolvedPm, opts, useJson, resolved, startedAt } = ctx;
  const {
    region,
    orm,
    database,
    databaseHost,
    payment,
    paymentChoice,
    auth,
    socialLoginIds,
    aiProviders,
    deployTarget,
    docs,
    metering,
    billingMode,
    idp,
    accessGate,
    mcp,
    waveToggles,
    previewSelections,
    config,
  } = resolved;

  const schemaFlags = {
    auth,
    payment: paymentChoice,
    "billing-mode": billingMode,
    idp,
    template: "saas", // TODO: wire up once --template flag returns
    "access-gate": accessGate,
    // community: intentionally not a template flag — Sleptons is Nebutra's own
    // product, stripped from Sailor-Template at mirror-sync time.
  };

  // -- clone --
  emitJson(useJson, { event: "step", step: "clone", status: "start" });
  await cloneTemplate(resolvedTarget);
  emitJson(useJson, { event: "step", step: "clone", status: "ok" });

  // -- package.json --
  emitJson(useJson, { event: "step", step: "package", status: "start" });
  await updatePackageJson(resolvedTarget, projectName);
  emitJson(useJson, { event: "step", step: "package", status: "ok" });

  // -- nebutra.config.json --
  emitJson(useJson, { event: "step", step: "config", status: "start" });
  await writeNebutraConfig(resolvedTarget, config);
  emitJson(useJson, { event: "step", step: "config", status: "ok" });

  // -- prune template --
  emitJson(useJson, { event: "step", step: "prune", status: "start" });
  await pruneTemplate(resolvedTarget, config);
  emitJson(useJson, { event: "step", step: "prune", status: "ok" });

  // Schema-level conditional pruning (early pass — before auth/db apply steps)
  {
    const schemaPath = path.join(resolvedTarget, "packages/platform/db/prisma/schema.prisma");
    let raw: string | undefined;
    try {
      raw = fs.readFileSync(schemaPath, "utf-8");
    } catch (err) {
      if (isMissingFileError(err)) {
        emitJson(useJson, { event: "step", step: "schema-prune", status: "skip" });
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        emitJson(useJson, { event: "step", step: "schema-prune", status: "error", error: msg });
      }
    }
    if (raw !== undefined) {
      emitJson(useJson, { event: "step", step: "schema-prune", status: "start" });
      try {
        const pruned = pruneSchemaByFlags(raw, schemaFlags);
        fs.writeFileSync(schemaPath, pruned);
        pruneMigrationsByFlags(path.join(path.dirname(schemaPath), "migrations"), schemaFlags);
        emitJson(useJson, { event: "step", step: "schema-prune", status: "ok" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emitJson(useJson, { event: "step", step: "schema-prune", status: "error", error: msg });
        // Non-fatal — the schema stays as-is; user can manually trim later.
      }
    }
  }

  // -- auth --
  emitJson(useJson, { event: "step", step: "auth", choice: auth, status: "start" });
  await applyAuthSelection(resolvedTarget, auth);
  emitJson(useJson, { event: "step", step: "auth", choice: auth, status: "ok" });

  // -- social login --
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

  // -- database --
  emitJson(useJson, { event: "step", step: "db", choice: database, status: "start" });
  await applyDatabaseSelection(resolvedTarget, database, projectName);
  if (database !== "none") {
    const hostMeta = getDatabaseHost(databaseHost);
    if (hostMeta) {
      await applyDatabaseHostSelection(resolvedTarget, hostMeta, projectName);
      emitJson(useJson, {
        event: "step",
        step: "db-host",
        choice: databaseHost,
        status: "ok",
      });
    }
  }
  emitJson(useJson, { event: "step", step: "db", choice: database, status: "ok" });

  // -- orm (drizzle only) --
  if (orm === "drizzle") {
    emitJson(useJson, { event: "step", step: "orm", choice: "drizzle", status: "start" });
    const result = await applyOrmSelection(resolvedTarget, "drizzle", database);
    emitJson(useJson, {
      event: "step",
      step: "orm",
      choice: "drizzle",
      status: result.applied ? "ok" : "skip",
      ...(result.reason ? { reason: result.reason } : {}),
    });
  }

  // -- payment --
  emitJson(useJson, { event: "step", step: "payment", choice: paymentChoice, status: "start" });
  await applyPaymentSelection(resolvedTarget, paymentChoice);
  emitJson(useJson, { event: "step", step: "payment", choice: paymentChoice, status: "ok" });

  // -- region-aware feature selections --
  await applyEmailSelection(resolvedTarget, resolved.email, region);
  if (useJson)
    emitJson(true, { event: "step", step: "email", choice: resolved.email, status: "ok" });

  await applyStorageSelection(resolvedTarget, resolved.storage, region);
  if (useJson)
    emitJson(true, { event: "step", step: "storage", choice: resolved.storage, status: "ok" });

  await applyMonitoringSelection(resolvedTarget, resolved.monitoring, region);
  if (useJson)
    emitJson(true, {
      event: "step",
      step: "monitoring",
      choice: resolved.monitoring,
      status: "ok",
    });

  await applyAnalyticsSelection(resolvedTarget, resolved.analytics, region);
  if (useJson)
    emitJson(true, { event: "step", step: "analytics", choice: resolved.analytics, status: "ok" });

  await applySmsSelection(resolvedTarget, resolved.sms, region);
  if (useJson) emitJson(true, { event: "step", step: "sms", choice: resolved.sms, status: "ok" });

  await applyQueueSelection(resolvedTarget, resolved.queue, region);
  if (useJson)
    emitJson(true, { event: "step", step: "queue", choice: resolved.queue, status: "ok" });

  await applySearchSelection(resolvedTarget, resolved.search, region);
  if (useJson)
    emitJson(true, { event: "step", step: "search", choice: resolved.search, status: "ok" });

  await applyCacheSelection(resolvedTarget, resolved.cache, region);
  if (useJson)
    emitJson(true, { event: "step", step: "cache", choice: resolved.cache, status: "ok" });

  await applyNotificationsSelection(resolvedTarget, resolved.notifications, region);
  if (useJson)
    emitJson(true, {
      event: "step",
      step: "notifications",
      choice: resolved.notifications,
      status: "ok",
    });

  await applyWebhooksSelection(resolvedTarget, resolved.webhooks, region);
  if (useJson)
    emitJson(true, { event: "step", step: "webhooks", choice: resolved.webhooks, status: "ok" });

  await applyCmsSelection(resolvedTarget, resolved.cms, region);
  if (useJson) emitJson(true, { event: "step", step: "cms", choice: resolved.cms, status: "ok" });

  await applyFeatureFlagsSelection(resolvedTarget, resolved.featureFlags, region);
  if (useJson)
    emitJson(true, {
      event: "step",
      step: "feature-flags",
      choice: resolved.featureFlags,
      status: "ok",
    });

  await applyCaptchaSelection(resolvedTarget, resolved.captcha, region);
  if (useJson)
    emitJson(true, { event: "step", step: "captcha", choice: resolved.captcha, status: "ok" });

  await applyMcpSwitch(resolvedTarget, mcp);
  if (useJson) emitJson(true, { event: "step", step: "mcp", mode: mcp, status: "ok" });

  await applyMeteringSwitch(resolvedTarget, metering, payment);
  if (useJson) emitJson(true, { event: "step", step: "metering", mode: metering, status: "ok" });

  // -- Wave 3-5 feature pruning --
  emitJson(useJson, { event: "step", step: "prune-wave-features", status: "start" });
  pruneWaveFeatures(resolvedTarget, waveToggles);
  emitJson(useJson, {
    event: "step",
    step: "prune-wave-features",
    status: "ok",
    toggles: waveToggles,
  });

  // Schema prune — strip @conditional model/enum blocks and gated migrations
  // that don't match the selection. Covers: auth, payment, billing-mode, idp,
  // template, access-gate.
  // (community flag was removed — Sleptons is Nebutra's own product, not a template
  // choice. Sleptons models are stripped at mirror-sync time by template-build.ts.)
  if (config.orm === "prisma" && config.database !== "none") {
    runSchemaPrune(useJson, resolvedTarget, schemaFlags);
  } else {
    emitJson(useJson, { event: "step", step: "schema-prune", status: "skip" });
  }

  // JSON events for flags whose "apply" effect is the schema prune above.
  emitJson(useJson, { event: "step", step: "billing-mode", choice: billingMode, status: "ok" });
  emitJson(useJson, { event: "step", step: "idp", choice: idp, status: "ok" });

  await applyComplianceTemplates(resolvedTarget, region);
  if (useJson) emitJson(true, { event: "step", step: "compliance", region, status: "ok" });

  await generateEnvSecrets(resolvedTarget);
  await generateSeedData(resolvedTarget, auth);
  await generateWelcomePage(resolvedTarget, {
    projectName,
    region,
    previewSelections,
    waveFeatures: waveToggles,
  });

  // -- AI providers --
  if (config.aiMode !== "none") {
    emitJson(useJson, { event: "step", step: "ai-providers", status: "start" });
    const selection = {
      providerIds: config.aiProviders,
      customEndpoint: config.customAiEndpoint,
    };
    // Hardcode templateDir to the cloned repo's packages/ai/ai-providers/templates
    const templateDir = path.join(resolvedTarget, "packages/ai/ai-providers/templates");
    await applyProviderSelection(resolvedTarget, selection, templateDir);
    emitJson(useJson, { event: "step", step: "ai-providers", status: "ok" });
  } else {
    emitJson(useJson, { event: "step", step: "ai-providers", status: "skip" });
  }

  // -- docs --
  emitJson(useJson, { event: "step", step: "docs", status: "start" });
  if (docs !== "none") {
    await applyDocsTemplate(resolvedTarget, { framework: docs, projectName });
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

  // -- deploy target --
  emitJson(useJson, { event: "step", step: "deploy-target", status: "start" });
  if (deployTarget !== "none") {
    await applyDeployTarget(resolvedTarget, deployTarget);
  }
  emitJson(useJson, { event: "step", step: "deploy-target", status: "ok" });

  // -- env --
  const envDefaults = {
    databaseUrl: "postgresql://postgres:postgres@localhost:5432/nebutra",
    clerkPublishable: "",
    clerkSecret: "",
  };
  emitJson(useJson, { event: "step", step: "env", status: "start" });
  await injectEnv(resolvedTarget, envDefaults);
  emitJson(useJson, { event: "step", step: "env", status: "ok" });

  // -- scaffold extras --
  emitJson(useJson, { event: "step", step: "scaffold-extras", status: "start" });
  const extras = await applyScaffoldExtras(resolvedTarget, {
    projectName,
    withWorkflows: Boolean(opts.withWorkflows),
    withPythonBackend: Boolean(opts.withPythonBackend),
  });
  emitJson(useJson, {
    event: "step",
    step: "scaffold-extras",
    status: "ok",
    applied: extras.applied,
    skipped: extras.skipped,
  });

  // -- license --
  // Independent Developer License + scaffold marker. Replaces the upstream
  // AGPL LICENSE inside the scaffolded project; the AGPL text is preserved
  // as LICENSE-AGPL-REFERENCE.md so the fork-path grant remains visible.
  emitJson(useJson, { event: "step", step: "license", status: "start" });
  try {
    const licenseEmit = emitIndependentLicense(resolvedTarget, {
      projectName,
      cliVersion: VERSION,
    });
    emitJson(useJson, {
      event: "step",
      step: "license",
      status: "ok",
      tier: "independent",
      wrote: licenseEmit.wrote,
    });
    if (!useJson) {
      process.stdout.write(
        pc.dim(
          `  License: Nebutra-Sailor Independent Developer License (free for ≤ 1 FTE, < $1M ARR).\n` +
            `           Upstream AGPL preserved as LICENSE-AGPL-REFERENCE.md.\n`,
        ),
      );
    }
  } catch (err) {
    // License emit must not block scaffolding. Log and continue so the
    // user still gets a working project; they can re-run with --no-install
    // and inspect the scaffold to recover.
    emitJson(useJson, {
      event: "step",
      step: "license",
      status: "warn",
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // -- install --
  const shouldInstall = opts.install !== false;
  if (shouldInstall) {
    const installProgram = resolvedPm === "bun" ? "bun" : resolvedPm;
    const installArgs = ["install"];
    if (useJson) {
      emitJson(true, { event: "step", step: "install", pm: resolvedPm, status: "start" });
    } else {
      process.stdout.write(pc.dim(`  Installing dependencies with ${resolvedPm}…\n`));
    }
    try {
      execFileSync(installProgram, installArgs, {
        cwd: resolvedTarget,
        stdio: useJson ? "ignore" : "inherit",
      });
      emitJson(useJson, { event: "step", step: "install", status: "ok" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (useJson) {
        emitJson(true, { event: "step", step: "install", status: "error", error: msg });
      } else {
        process.stdout.write(
          pc.yellow(`  ⚠ install failed — run '${resolvedPm} install' manually.\n`),
        );
      }
      // Non-fatal — project was still scaffolded.
    }
  } else {
    emitJson(useJson, { event: "step", step: "install", status: "skip" });
  }

  // -- git init --
  const shouldGit = opts.git !== false;
  if (shouldGit) {
    if (useJson) emitJson(true, { event: "step", step: "git-init", status: "start" });
    try {
      execFileSync("git", ["init", "-q"], { cwd: resolvedTarget, stdio: "ignore" });
      execFileSync("git", ["add", "-A"], { cwd: resolvedTarget, stdio: "ignore" });
      execFileSync(
        "git",
        [
          "-c",
          "user.email=you@example.com",
          "-c",
          "user.name=You",
          "commit",
          "-q",
          "-m",
          "chore: initial scaffold from create-sailor",
        ],
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
    emitPreviewWarnings(useJson, previewSelections);
  }

  if (useJson) {
    emitJson(true, {
      event: "done",
      status: "ok",
      elapsedSec,
      targetDir: resolvedTarget,
      previewSelections,
      waveFeatures: waveToggles,
    });
  } else {
    showDone({
      elapsedSec,
      targetDir: resolvedTarget,
      skippedInstall: opts.install === false,
      previewSelections,
      waveFeatures: waveToggles,
    });
  }

  // Update notifier (non-blocking)
  try {
    updateNotifier({
      pkg: { name: "create-sailor", version: VERSION },
      updateCheckInterval: 1000 * 60 * 60 * 24,
    }).notify({ defer: false, isGlobal: true });
  } catch {
    // swallow — non-critical
  }
}
