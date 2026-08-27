/**
 * Shared types for the create-sailor wizard steps.
 * Consumed by mappers, cli-setup, resolve-config, and scaffold.
 */

import type { AiMode } from "../utils/ai-topology";

export interface CliOptions {
  pm?: string;
  region?: string;
  orm?: string;
  db?: string;
  dbHost?: string;
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
  accessGate?: string;
  // Wave 3-5 feature toggles. Each accepts `true` | `false`; we parse with
  // `parseBoolFlag` so users can write `--cron-jobs=false` from CI scripts.
  cronJobs?: string;
  auditLog?: string;
  apiKeys?: string;
  commandPalette?: string;
  cookieConsent?: string;
  legalPages?: string;
  chinaCompliance?: string;
  i18n?: boolean;
  withWorkflows?: boolean;
  withPythonBackend?: boolean;
  install?: boolean;
  git?: boolean;
  yes?: boolean;
  dryRun?: boolean;
  json?: boolean;
  color?: boolean;
  help?: boolean;
}

export interface InteractiveAnswers {
  region?: string;
  auth?: string;
  aiMode?: AiMode;
  aiProviders?: string[];
  customAiName?: string;
  customAiBaseUrl?: string;
  customAiApiKeyEnv?: string;
}

export type PromptContext = {
  results: InteractiveAnswers;
};

export type PromptFactory = (context: PromptContext) => Promise<unknown>;

export type JsonEvent = {
  event: string;
  step?: string;
  status?: "ok" | "error" | "skip" | "start" | "warn";
  message?: string;
  [k: string]: unknown;
};

export interface RegionDefaults {
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
  accessGate: string;
}
