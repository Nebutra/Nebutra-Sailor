/**
 * Config resolution — translates parsed CLI opts into a fully-typed
 * NebutraConfig, running interactive prompts when required.
 *
 * Exports:
 *   resolveConfig(opts, useJson)  — top-level entry used by index.ts
 */

import * as p from "@clack/prompts";
import pc from "picocolors";
import { PROVIDERS } from "../utils/ai-meta";
import { type AiMode, resolveAiTopology } from "../utils/ai-topology";
import type { AuthChoice } from "../utils/auth";
import { parseSocialLoginFlag, type SocialLoginId } from "../utils/auth-social";
import type { DocsFramework, NebutraConfig, Region } from "../utils/config";
import type { DatabaseHostId } from "../utils/database-host-meta";
import { resolveScaffoldDeployTargets } from "../utils/deploy";
import { collectPreviewSelections, type PreviewSelection } from "../utils/package-status";
import type { PaymentChoice } from "../utils/payment";
import type { WaveFeatureToggles } from "../utils/wave-features";
import { resolveWaveFeatureToggles } from "../utils/wave-features";
import {
  defaultPaymentForRegion,
  isAiTopologyShorthand,
  mapAi,
  mapDb,
  mapDeploy,
  mapOrm,
  mapPayment,
  regionDefaults,
  resolveAuthChoice,
  resolveDatabaseHost,
  resolveDocs,
  resolvePaymentChoice,
  resolveRegion,
  resolveStorageChoice,
} from "./mappers";
import type { CliOptions, InteractiveAnswers, PromptContext, PromptFactory } from "./types";

// ---------------------------------------------------------------------------
// Resolved config shape (returned to index.ts)
// ---------------------------------------------------------------------------

export interface ResolvedConfig {
  region: Region;
  orm: NebutraConfig["orm"];
  database: NebutraConfig["database"];
  databaseHost: DatabaseHostId;
  payment: NebutraConfig["payment"];
  paymentChoice: PaymentChoice;
  auth: AuthChoice;
  socialLoginIds: SocialLoginId[];
  aiMode: AiMode;
  aiRouting: NebutraConfig["aiRouting"];
  aiProviders: NebutraConfig["aiProviders"];
  customAiEndpoint: NebutraConfig["customAiEndpoint"];
  deployTarget: NebutraConfig["deployTarget"];
  deployTargets: NebutraConfig["deployTargets"];
  docs: DocsFramework;
  i18n: boolean;
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
  billingMode: "usage" | "seat" | "credits";
  idp: "clerk" | "oauth-server";
  accessGate: "none" | "invite";
  waveToggles: WaveFeatureToggles;
  previewSelections: PreviewSelection[];
  config: NebutraConfig;
}

// ---------------------------------------------------------------------------
// Interactive prompt group
// ---------------------------------------------------------------------------

async function runInteractivePrompts(
  _opts: CliOptions,
  hasRegion: boolean,
  hasAuth: boolean,
  hasAi: boolean,
): Promise<InteractiveAnswers> {
  const promptGroup: Record<string, PromptFactory> = {};

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
          { value: "clerk", label: "Clerk", hint: "managed, fastest setup" },
          {
            value: "betterauth",
            label: "Better Auth",
            hint: "self-hosted, modern (2FA / passkeys / RBAC)",
          },
          {
            value: "nextauth",
            label: "NextAuth (Auth.js v5)",
            hint: "self-hosted, mature, large ecosystem",
          },
          {
            value: "supabase",
            label: "Supabase Auth",
            hint: "managed auth with Supabase storage/realtime ecosystem",
          },
          { value: "none", label: "None" },
        ],
        initialValue: "clerk",
      }) as Promise<unknown>;
  }

  if (!hasAi) {
    promptGroup.aiMode = () =>
      p.select({
        message: "AI topology?",
        options: [
          {
            value: "gateway",
            label: "Multi-provider AI Gateway / router",
            hint: "recommended",
          },
          { value: "direct", label: "Direct SDK/provider adapters" },
          { value: "custom", label: "OpenAI-compatible endpoint" },
          { value: "none", label: "Skip AI" },
        ],
        initialValue: "gateway",
      }) as Promise<unknown>;

    promptGroup.aiProviders = ({ results }: PromptContext) => {
      if (results.aiMode !== "direct") return Promise.resolve([]);

      const aiOptions = PROVIDERS.map((p) => ({
        value: p.id,
        label: `[${p.category}] ${p.name}`,
      }));

      return p.multiselect({
        message: "Select direct AI provider adapters (expert path)",
        options: aiOptions,
        initialValues: ["openai"],
        required: false,
      });
    };

    promptGroup.customAiName = ({ results }: PromptContext) => {
      if (results.aiMode === "custom") {
        return p.text({
          message: "Custom endpoint name (e.g. proxy, local):",
          defaultValue: "custom",
          placeholder: "custom",
        });
      }
      return Promise.resolve(undefined);
    };

    promptGroup.customAiBaseUrl = ({ results }: PromptContext) => {
      if (results.aiMode === "custom") {
        return p.text({
          message: "Custom endpoint base URL (e.g. https://api.proxy.com/v1):",
          validate: (value) => {
            if (!value?.length) return "Base URL is required.";
          },
        });
      }
      return Promise.resolve(undefined);
    };

    promptGroup.customAiApiKeyEnv = ({ results }: PromptContext) => {
      if (results.aiMode === "custom") {
        return p.text({
          message: "Environment variable name for the API Key:",
          defaultValue: "CUSTOM_AI_API_KEY",
          placeholder: "CUSTOM_AI_API_KEY",
        });
      }
      return Promise.resolve(undefined);
    };
  }

  if (Object.keys(promptGroup).length === 0) return {};

  return (await p.group(promptGroup, {
    onCancel: () => {
      process.stdout.write(pc.red("✘ Cancelled\n"));
      process.exit(130);
    },
  })) as InteractiveAnswers;
}

// ---------------------------------------------------------------------------
// resolveConfig — main export
// ---------------------------------------------------------------------------

export async function resolveConfig(opts: CliOptions, useJson: boolean): Promise<ResolvedConfig> {
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

  const autoYes = Boolean(opts.yes);
  const nonInteractive = autoYes || !process.stdin.isTTY;

  // ---- Core selections (some need interactive prompts) ----
  let region: Region;
  let orm: NebutraConfig["orm"];
  let database: NebutraConfig["database"];
  let databaseHost: DatabaseHostId;
  let payment: NebutraConfig["payment"];
  let paymentChoice: PaymentChoice;
  let auth: AuthChoice;
  const socialLoginIds: SocialLoginId[] = parseSocialLoginFlag(opts.socialLogin);
  let aiMode: AiMode;
  let aiRouting: NebutraConfig["aiRouting"];
  let aiProviders: NebutraConfig["aiProviders"];
  let customAiEndpoint: NebutraConfig["customAiEndpoint"];
  let deployTarget: NebutraConfig["deployTarget"];
  let docs: DocsFramework;
  let i18n: boolean;

  if (nonInteractive) {
    region = resolveRegion(opts.region);
    orm = mapOrm(opts.orm);
    {
      const engineFromDb = mapDb(opts.db);
      const resolved = resolveDatabaseHost(opts.dbHost, region, engineFromDb);
      database = resolved.engine;
      databaseHost = resolved.hostId;
    }
    const rawPayment = hasPayment ? opts.payment : defaultPaymentForRegion(region);
    payment = mapPayment(rawPayment);
    paymentChoice = resolvePaymentChoice(rawPayment);
    auth = resolveAuthChoice(opts.auth);

    // Resolve AI mode from --ai flag:
    //  - omitted → gateway (recommended default)
    //  - "gateway"/"direct"/"custom"/"none" → that topology with default provider seed
    //  - any other comma-separated string → direct mode with explicit providers
    let aiResolvedMode: AiMode = "gateway";
    if (hasAi) {
      const rawAi = opts.ai?.trim().toLowerCase() ?? "";
      if (isAiTopologyShorthand(rawAi)) {
        aiResolvedMode = rawAi as AiMode;
      } else {
        aiResolvedMode = "direct";
      }
    }
    const topology = resolveAiTopology({
      mode: aiResolvedMode,
      providerIds: hasAi ? mapAi(opts.ai) : undefined,
    });
    aiMode = topology.mode;
    aiRouting = topology.routing;
    aiProviders = topology.providerIds;
    deployTarget = mapDeploy(opts.deploy);
    docs = resolveDocs(opts.docs, useJson);
    i18n = hasI18n ? Boolean(opts.i18n) : true;
  } else {
    // Interactive prompts — only 4 questions: project / region / auth / AI.
    const answers = await runInteractivePrompts(opts, hasRegion, hasAuth, hasAi);

    region = resolveRegion(hasRegion ? opts.region : answers.region);

    // Everything below is flag-only (no prompt); defaults are region-based.
    orm = mapOrm(opts.orm);
    {
      const engineFromDb = mapDb(opts.db);
      const resolved = resolveDatabaseHost(opts.dbHost, region, engineFromDb);
      database = resolved.engine;
      databaseHost = resolved.hostId;
    }
    const rawPayment = hasPayment ? opts.payment : defaultPaymentForRegion(region);
    payment = mapPayment(rawPayment);
    paymentChoice = resolvePaymentChoice(rawPayment);
    auth = resolveAuthChoice(hasAuth ? opts.auth : answers.auth);
    const customEndpoint =
      answers.aiMode === "custom"
        ? {
            name: answers.customAiName ?? "custom",
            baseURL: answers.customAiBaseUrl ?? "",
            apiKeyEnvName: answers.customAiApiKeyEnv ?? "CUSTOM_AI_API_KEY",
          }
        : undefined;
    const topology = resolveAiTopology({
      mode: hasAi
        ? opts.ai?.trim().toLowerCase() === "none"
          ? "none"
          : "direct"
        : (answers.aiMode ?? "gateway"),
      providerIds: hasAi ? mapAi(opts.ai) : answers.aiProviders,
      customEndpoint,
    });
    aiMode = topology.mode;
    aiRouting = topology.routing;
    aiProviders = topology.providerIds;
    if (topology.customEndpoint) {
      customAiEndpoint = {
        name: topology.customEndpoint.name,
        baseURL: topology.customEndpoint.baseURL,
        apiKeyEnvName: topology.customEndpoint.apiKeyEnvName,
      };
    }
    deployTarget = mapDeploy(opts.deploy);
    docs = resolveDocs(opts.docs, useJson);
    i18n = hasI18n ? Boolean(opts.i18n) : true;
  }

  // ---- Region-based smart defaults for feature flags ----
  const rDefaults = regionDefaults(region);
  const email = hasEmail ? (opts.email as string) : rDefaults.email;
  const storage = resolveStorageChoice(hasStorage ? opts.storage : undefined, rDefaults.storage);
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
  const billingMode = (opts.billingMode ?? rDefaults.billingMode) as "usage" | "seat" | "credits";
  const idp = (opts.idp ?? rDefaults.idp) as "clerk" | "oauth-server";
  const accessGate = (opts.accessGate === "invite" ? "invite" : rDefaults.accessGate) as
    | "none"
    | "invite";
  const deployTargets = resolveScaffoldDeployTargets(deployTarget);

  // Wave 3-5 feature toggles — region-aware defaults, flag overrides.
  const waveToggles = resolveWaveFeatureToggles(
    {
      cronJobs: opts.cronJobs,
      auditLog: opts.auditLog,
      apiKeys: opts.apiKeys,
      commandPalette: opts.commandPalette,
      cookieConsent: opts.cookieConsent,
      legalPages: opts.legalPages,
      chinaCompliance: opts.chinaCompliance,
    },
    region,
  );

  // Detect any non-stable provider selections so we can warn the user
  // before/after install and emit structured events for --json consumers.
  const previewSelections: PreviewSelection[] = collectPreviewSelections([
    { flag: "queue", provider: queue },
    { flag: "search", provider: search },
    { flag: "notifications", provider: notifications },
    { flag: "webhooks", provider: webhooks },
    { flag: "feature-flags", provider: featureFlags },
    { flag: "captcha", provider: captcha },
    { flag: "access-gate", provider: accessGate },
  ]);

  const config: NebutraConfig = {
    region,
    orm,
    database,
    payment,
    aiMode,
    aiRouting,
    aiProviders,
    customAiEndpoint,
    deployTarget,
    deployTargets,
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
    accessGate,
    cronJobs: waveToggles.cronJobs,
    auditLog: waveToggles.auditLog,
    apiKeys: waveToggles.apiKeys,
    commandPalette: waveToggles.commandPalette,
    cookieConsent: waveToggles.cookieConsent,
    legalPages: waveToggles.legalPages,
    chinaCompliance: waveToggles.chinaCompliance,
  };

  return {
    region,
    orm,
    database,
    databaseHost,
    payment,
    paymentChoice,
    auth,
    socialLoginIds,
    aiMode,
    aiRouting,
    aiProviders,
    customAiEndpoint,
    deployTarget,
    deployTargets,
    docs,
    i18n,
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
    mcp,
    metering,
    billingMode,
    idp,
    accessGate,
    waveToggles,
    previewSelections,
    config,
  };
}

// ---------------------------------------------------------------------------
// Re-export helpers used by index.ts for the summary table + social login labels
// ---------------------------------------------------------------------------
export { SOCIAL_LOGIN_PROVIDERS } from "../utils/auth-social";
