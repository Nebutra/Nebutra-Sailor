/**
 * Post-summary confirmation + optional customization of region-defaulted
 * providers. Keeps the main wizard short while making silent defaults visible
 * and editable before any files are written.
 */

import * as p from "@clack/prompts";
import { mapDeploy, mapPayment, resolvePaymentChoice } from "../steps/mappers";
import type { ResolvedConfig } from "../steps/resolve-config";
import type { NebutraConfig } from "./config";
import { resolveScaffoldDeployTargets } from "./deploy";
import { EMAIL_PROVIDERS } from "./email-meta";
import { collectPreviewSelections } from "./package-status";
import type { PaymentChoice } from "./payment";
import { STORAGE_PROVIDERS } from "./storage-meta";

export type ReviewOutcome = "proceed" | "cancelled";

function rebuildConfig(resolved: ResolvedConfig): NebutraConfig {
  return {
    ...resolved.config,
    region: resolved.region,
    orm: resolved.orm,
    database: resolved.database,
    databaseHost: resolved.databaseHost,
    payment: resolved.payment,
    aiMode: resolved.aiMode,
    aiRouting: resolved.aiRouting,
    aiProviders: resolved.aiProviders,
    customAiEndpoint: resolved.customAiEndpoint,
    deployTarget: resolved.deployTarget,
    deployTargets: resolved.deployTargets,
    docs: resolved.docs,
    i18n: resolved.i18n,
    email: resolved.email,
    storage: resolved.storage,
    monitoring: resolved.monitoring,
    analytics: resolved.analytics,
    sms: resolved.sms,
    queue: resolved.queue as NebutraConfig["queue"],
    search: resolved.search as NebutraConfig["search"],
    cache: resolved.cache as NebutraConfig["cache"],
    notifications: resolved.notifications as NebutraConfig["notifications"],
    webhooks: resolved.webhooks as NebutraConfig["webhooks"],
    cms: resolved.cms as NebutraConfig["cms"],
    featureFlags: resolved.featureFlags as NebutraConfig["featureFlags"],
    captcha: resolved.captcha as NebutraConfig["captcha"],
    mcp: resolved.mcp as NebutraConfig["mcp"],
    metering: resolved.metering as NebutraConfig["metering"],
    billingMode: resolved.billingMode,
    idp: resolved.idp,
    accessGate: resolved.accessGate,
  };
}

function refreshPreview(resolved: ResolvedConfig): void {
  resolved.previewSelections = collectPreviewSelections([
    { flag: "queue", provider: resolved.queue },
    { flag: "search", provider: resolved.search },
    { flag: "notifications", provider: resolved.notifications },
    { flag: "webhooks", provider: resolved.webhooks },
    { flag: "feature-flags", provider: resolved.featureFlags },
    { flag: "captcha", provider: resolved.captcha },
    { flag: "access-gate", provider: resolved.accessGate },
  ]);
  resolved.config = rebuildConfig(resolved);
}

async function customizeProviders(resolved: ResolvedConfig, onCancel: () => never): Promise<void> {
  const payment = await p.select({
    message: "Payment provider",
    options: [
      { value: "stripe", label: "Stripe", hint: "global default" },
      { value: "lemon", label: "Lemon Squeezy" },
      { value: "wechat", label: "WeChat Pay", hint: "CN" },
      { value: "alipay", label: "Alipay", hint: "CN" },
      { value: "none", label: "None" },
    ],
    initialValue: resolved.paymentChoice,
  });
  if (p.isCancel(payment)) onCancel();
  const paymentRaw = String(payment);
  resolved.payment = mapPayment(paymentRaw);
  resolved.paymentChoice = resolvePaymentChoice(paymentRaw);

  const email = await p.select({
    message: "Email provider",
    options: EMAIL_PROVIDERS.map((e) => ({
      value: e.id,
      label: e.name,
      hint: e.region === "cn" ? "CN" : e.id === "none" ? undefined : "global",
    })),
    initialValue: resolved.email,
  });
  if (p.isCancel(email)) onCancel();
  resolved.email = String(email);

  const storage = await p.select({
    message: "Object storage",
    options: STORAGE_PROVIDERS.map((s) => ({
      value: s.id,
      label: s.name,
      hint: s.region === "cn" ? "CN" : s.id === "none" ? undefined : "global",
    })),
    initialValue: resolved.storage,
  });
  if (p.isCancel(storage)) onCancel();
  resolved.storage = String(storage);

  const deploy = await p.select({
    message: "Deploy target",
    options: [
      { value: "vercel", label: "Vercel", hint: "recommended for Next.js" },
      { value: "railway", label: "Railway" },
      { value: "cloudflare", label: "Cloudflare" },
      { value: "selfhost", label: "Self-host / Docker" },
    ],
    initialValue: resolved.deployTarget,
  });
  if (p.isCancel(deploy)) onCancel();
  resolved.deployTarget = mapDeploy(String(deploy));
  resolved.deployTargets = resolveScaffoldDeployTargets(resolved.deployTarget);

  refreshPreview(resolved);
}

/**
 * Interactive: confirm region defaults; optionally customize payment/email/storage/deploy.
 * Non-interactive callers should not invoke this.
 */
export async function confirmAndMaybeReview(
  resolved: ResolvedConfig,
  onCancel: () => never,
): Promise<ResolvedConfig> {
  // Work on a shallow clone of field bag so we can rebuild config safely.
  const draft: ResolvedConfig = {
    ...resolved,
    config: { ...resolved.config },
    aiProviders: [...resolved.aiProviders],
    socialLoginIds: [...resolved.socialLoginIds],
    previewSelections: [...resolved.previewSelections],
    deployTargets: { ...resolved.deployTargets },
    waveToggles: { ...resolved.waveToggles },
  };

  const action = await p.select({
    message: "Create project with these settings?",
    options: [
      {
        value: "proceed",
        label: "Yes, create project",
        hint: "use region defaults above",
      },
      {
        value: "customize",
        label: "Customize key providers",
        hint: "payment · email · storage · deploy",
      },
      { value: "cancel", label: "Cancel" },
    ],
    initialValue: "proceed",
  });

  if (p.isCancel(action) || action === "cancel") onCancel();

  if (action === "customize") {
    await customizeProviders(draft, onCancel);
    p.log.success("Defaults updated — scaffolding with your choices.");
  }

  return draft;
}

/** Pure helper for tests: apply payment/email/storage/deploy overrides onto a resolved config. */
export function applyProviderOverrides(
  resolved: ResolvedConfig,
  overrides: {
    payment?: PaymentChoice;
    email?: string;
    storage?: string;
    deploy?: string;
  },
): ResolvedConfig {
  const draft: ResolvedConfig = {
    ...resolved,
    config: { ...resolved.config },
    aiProviders: [...resolved.aiProviders],
    socialLoginIds: [...resolved.socialLoginIds],
    previewSelections: [...resolved.previewSelections],
    deployTargets: { ...resolved.deployTargets },
    waveToggles: { ...resolved.waveToggles },
  };

  if (overrides.payment) {
    draft.payment = mapPayment(overrides.payment);
    draft.paymentChoice = resolvePaymentChoice(overrides.payment);
  }
  if (overrides.email) draft.email = overrides.email;
  if (overrides.storage) draft.storage = overrides.storage;
  if (overrides.deploy) {
    draft.deployTarget = mapDeploy(overrides.deploy);
    draft.deployTargets = resolveScaffoldDeployTargets(draft.deployTarget);
  }
  refreshPreview(draft);
  return draft;
}
