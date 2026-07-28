/**
 * W3 · Detector root — secret / API-key scanner (brief: docs/plans/tools/secret-scan.md).
 *
 * One pure tool: `dev/secret-scan` — "does this pasted text contain something
 * that pattern-matches a known credential format, and how confident are we".
 *
 * Domain rules implemented from the brief §7:
 *  1. detection is pattern-match *and* entropy, not a keyword grep — a vendor
 *     without a distinctive prefix is only reachable through Shannon entropy
 *  2. context boosts confidence: the same 40-char base64 blob is near-certain
 *     next to `AWS_SECRET_ACCESS_KEY` and near-noise inside a fixture, so the
 *     variable name on the line is weighted alongside the entropy score
 *  3. ambiguous shapes report ranked *candidates*, never one forced guess
 *  4. placeholder suppression, the paste-tool equivalent of gitleaks'
 *     allowlists: `AKIAIOSFODNN7EXAMPLE`, `your-api-key-here`, `sk-xxxx…`,
 *     repeated/sequential runs and very low entropy are dropped, and counted
 *  5. read-only and local: no network, no fs, no verification call. Confirming
 *     a key is live means transmitting it to a third party — that is
 *     auto-exfiltration, and it is out of this root by design
 *  6. Detector ≠ Checker: no risk tier, no blast radius, no validation command
 *  7. large pastes are capped in bytes (`maxBytes`) and the cap is reported
 *  8. every finding carries line + column, so the user can go redact it
 *
 * Nothing here reveals a secret: findings carry a masked value only. The raw
 * matched text never leaves this function.
 */

import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/* ── public shape ───────────────────────────────────────────────────────── */

export type SecretConfidence = "high" | "medium" | "low";

export interface SecretFinding {
  /** Rule id — the machine-stable type, e.g. `aws_access_key_id`. */
  readonly type: string;
  /** Human vendor name for the same type, e.g. "AWS Access Key ID". */
  readonly label: string;
  readonly confidence: SecretConfidence;
  /** 1-based line inside the scanned (possibly truncated) text. */
  readonly line: number;
  /** 1-based column of the match start inside that line. */
  readonly column: number;
  /** First/last few characters only — never the whole secret. */
  readonly maskedValue: string;
  readonly valueLength: number;
  /** Why we think so, in one sentence. */
  readonly reason: string;
  /** Other type guesses when the shape is genuinely ambiguous (§7 rule 3). */
  readonly candidates?: readonly string[];
  /** Shannon entropy in bits/char, present when entropy drove the finding. */
  readonly entropy?: number;
  /** The variable name on the line, when it is what raised the confidence. */
  readonly contextKey?: string;
}

export interface SecretScanOutput {
  readonly verdict: "clean" | "found";
  readonly findingCount: number;
  readonly findings: readonly SecretFinding[];
  /** True when the input exceeded `maxBytes` and only the head was scanned. */
  readonly truncated: boolean;
  readonly scannedBytes: number;
  readonly lineCount: number;
  /** Matches dropped as known placeholders / demo values (§7 rule 4). */
  readonly suppressedCount: number;
  /** Findings beyond `maxFindings`, dropped after sorting. */
  readonly omittedCount: number;
  readonly counts: { readonly high: number; readonly medium: number; readonly low: number };
}

/* ── input schema ───────────────────────────────────────────────────────── */

export const secretScanInputSchema = z.object({
  /** The pasted text. Bounded so an agent cannot post an unbounded body. */
  text: z
    .string()
    .min(1)
    .max(4_194_304)
    .describe("Text to scan: a .env file, config dump, log excerpt or code snippet."),
  maxBytes: z.coerce
    .number()
    .int()
    .min(1_024)
    .max(1_048_576)
    .default(262_144)
    .describe("UTF-8 byte cap; input beyond this is not scanned and `truncated` is set."),
  // Not `z.coerce.boolean()` on purpose: coercion turns the string "false"
  // into `true`, which would silently invert an agent's quiet-mode request.
  includeLowConfidence: z
    .boolean()
    .default(true)
    .describe("Include low-confidence entropy-only findings. Set false for a quieter gate."),
  maxFindings: z.coerce
    .number()
    .int()
    .min(1)
    .max(1_000)
    .default(200)
    .describe("Cap on returned findings after sorting by confidence, then position."),
});

export type SecretScanInput = z.infer<typeof secretScanInputSchema>;

/* ── rule catalog ───────────────────────────────────────────────────────── */

interface SecretRule {
  readonly id: string;
  readonly label: string;
  /** Source of a global regex; recompiled per scan so `lastIndex` is never shared. */
  readonly pattern: RegExp;
  /** Capture group holding the credential (default 1). */
  readonly group?: number;
  readonly confidence: SecretConfidence;
  readonly reason: string;
  /** Alternate type guesses when this rule is the primary match (§7 rule 3). */
  readonly ambiguousWith?: readonly string[];
  /**
   * `marker` = the match is a *label* for key material (a PEM header), not the
   * key material itself, so it is shown verbatim instead of masked.
   */
  readonly mask?: "value" | "marker";
}

/**
 * Vendor-prefix catalog, ported from the gitleaks rule corpus (MIT,
 * github.com/gitleaks/gitleaks — declared feature-complete, so a stable base).
 * This is data: extend the table, never branch on a vendor id in the matcher.
 *
 * Deliberately absent: publishable/public identifiers such as Stripe `pk_live_`
 * and Google OAuth client ids. Flagging a value that is *designed* to ship in a
 * browser bundle trains users to ignore the verdict.
 */
const RULES: readonly SecretRule[] = [
  // ── cloud providers ──────────────────────────────────────────────────
  {
    id: "aws_access_key_id",
    label: "AWS Access Key ID",
    pattern: /\b((?:AKIA|ASIA|ABIA|ACCA|AGPA|AIDA|AIPA|ANPA|ANVA|AROA|APKA)[A-Z0-9]{16})\b/g,
    confidence: "high",
    reason: "AWS key-id prefix followed by 16 uppercase base32 characters",
  },
  {
    id: "aws_secret_access_key",
    label: "AWS Secret Access Key",
    pattern: /aws[_.-]?secret[_.-]?access[_.-]?key["'\s]*[:=]+\s*["']?([A-Za-z0-9/+=]{40})/gi,
    confidence: "high",
    reason: "40-character AWS secret assigned to an aws_secret_access_key variable",
  },
  {
    id: "alibaba_access_key_id",
    label: "Alibaba Cloud AccessKey ID",
    pattern: /\b(LTAI[A-Za-z0-9]{12,20})\b/g,
    confidence: "high",
    reason: "Alibaba Cloud AccessKey ID prefix (LTAI)",
  },
  {
    id: "tencent_secret_id",
    label: "Tencent Cloud SecretId",
    pattern: /\b(AKID[A-Za-z0-9]{13,40})\b/g,
    confidence: "high",
    reason: "Tencent Cloud SecretId prefix (AKID)",
  },
  {
    id: "google_api_key",
    label: "Google API Key",
    pattern: /\b(AIza[0-9A-Za-z_-]{35})(?![\w-])/g,
    confidence: "high",
    reason: "Google API key prefix (AIza) followed by 35 url-safe characters",
  },
  {
    id: "gcp_service_account",
    label: "Google Service Account Key File",
    pattern: /("type"\s*:\s*"service_account")/g,
    confidence: "medium",
    mask: "marker",
    reason: "Google service-account JSON — the file normally embeds a private key",
  },
  {
    id: "firebase_cloud_messaging_key",
    label: "Firebase Cloud Messaging Server Key",
    pattern: /\b(AAAA[A-Za-z0-9_-]{7}:APA91b[A-Za-z0-9_-]{100,})(?![\w-])/g,
    confidence: "high",
    reason: "FCM server key shape (AAAA…:APA91b…)",
  },
  {
    id: "digitalocean_token",
    label: "DigitalOcean Token",
    pattern: /\b((?:dop|doo|dor)_v1_[a-f0-9]{64})\b/g,
    confidence: "high",
    reason: "DigitalOcean v1 token prefix followed by 64 hex characters",
  },
  {
    id: "cloudflare_api_token",
    label: "Cloudflare API Token",
    pattern:
      /cloudflare[_.-]?(?:api[_.-]?)?token["'\s]*[:=]+\s*["']?([A-Za-z0-9_-]{40})(?![\w-])/gi,
    confidence: "high",
    reason: "40-character token assigned to a Cloudflare token variable",
  },

  // ── source control, registries, CI ───────────────────────────────────
  {
    id: "github_pat",
    label: "GitHub Personal Access Token",
    pattern: /\b(gh[pousr]_[A-Za-z0-9]{36})\b/g,
    confidence: "high",
    reason: "GitHub token prefix (ghp_/gho_/ghu_/ghs_/ghr_) followed by 36 characters",
  },
  {
    id: "github_fine_grained_pat",
    label: "GitHub Fine-Grained Token",
    pattern: /\b(github_pat_[A-Za-z0-9]{22}_[A-Za-z0-9]{59})\b/g,
    confidence: "high",
    reason: "GitHub fine-grained token layout (github_pat_<22>_<59>)",
  },
  {
    id: "gitlab_pat",
    label: "GitLab Personal Access Token",
    pattern: /\b(glpat-[A-Za-z0-9_-]{20})(?![\w-])/g,
    confidence: "high",
    reason: "GitLab token prefix (glpat-) followed by 20 characters",
  },
  {
    id: "gitlab_runner_token",
    label: "GitLab Runner Registration Token",
    pattern: /\b(GR1348941[A-Za-z0-9_-]{20})(?![\w-])/g,
    confidence: "high",
    reason: "GitLab runner registration token prefix (GR1348941)",
  },
  {
    id: "npm_token",
    label: "npm Access Token",
    pattern: /\b(npm_[A-Za-z0-9]{36})\b/g,
    confidence: "high",
    reason: "npm token prefix (npm_) followed by 36 characters",
  },
  {
    id: "pypi_token",
    label: "PyPI Upload Token",
    pattern: /\b(pypi-AgEIcHlwaS5vcmc[A-Za-z0-9_-]{50,})(?![\w-])/g,
    confidence: "high",
    reason: "PyPI macaroon token prefix (pypi-AgEIcHlwaS5vcmc)",
  },
  {
    id: "rubygems_token",
    label: "RubyGems API Key",
    pattern: /\b(rubygems_[a-f0-9]{48})\b/g,
    confidence: "high",
    reason: "RubyGems key prefix followed by 48 hex characters",
  },
  {
    id: "nuget_api_key",
    label: "NuGet API Key",
    pattern: /\b(oy2[a-z0-9]{43})\b/g,
    confidence: "medium",
    reason: "NuGet key prefix (oy2) followed by 43 lowercase alphanumerics",
  },
  {
    id: "sonarqube_token",
    label: "SonarQube Token",
    pattern: /\b(sq[apu]_[a-f0-9]{40})\b/g,
    confidence: "high",
    reason: "SonarQube token prefix (sqa_/sqp_/squ_) followed by 40 hex characters",
  },
  {
    id: "postman_api_key",
    label: "Postman API Key",
    pattern: /\b(PMAK-[a-f0-9]{24}-[a-f0-9]{34})\b/g,
    confidence: "high",
    reason: "Postman key layout (PMAK-<24 hex>-<34 hex>)",
  },
  {
    id: "terraform_cloud_token",
    label: "Terraform Cloud / HCP Token",
    pattern: /\b([A-Za-z0-9]{14}\.atlasv1\.[A-Za-z0-9_-]{20,})(?![\w-])/g,
    confidence: "high",
    reason: "Terraform Cloud token layout (<id>.atlasv1.<secret>)",
  },

  // ── messaging / SaaS ─────────────────────────────────────────────────
  {
    id: "slack_token",
    label: "Slack Token",
    pattern: /\b(xox[abposr]-[A-Za-z0-9-]{10,})(?![\w-])/g,
    confidence: "high",
    reason: "Slack token prefix (xoxb-/xoxp-/xoxa-/xoxo-/xoxs-/xoxr-)",
  },
  {
    id: "slack_app_token",
    label: "Slack App-Level Token",
    pattern: /\b(xapp-\d-[A-Z0-9]+-\d+-[a-f0-9]{20,})(?![\w-])/g,
    confidence: "high",
    reason: "Slack app-level token layout (xapp-1-<app>-<id>-<hex>)",
  },
  {
    id: "slack_webhook_url",
    label: "Slack Incoming Webhook",
    pattern:
      /(https:\/\/hooks\.slack\.com\/services\/T[A-Za-z0-9_]+\/B[A-Za-z0-9_]+\/[A-Za-z0-9]{20,})/g,
    confidence: "high",
    reason: "Slack incoming-webhook URL — the path is the credential",
  },
  {
    id: "discord_webhook_url",
    label: "Discord Webhook",
    pattern:
      /(https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d{17,20}\/[A-Za-z0-9_-]{60,})(?![\w-])/g,
    confidence: "high",
    reason: "Discord webhook URL — the token segment is the credential",
  },
  {
    id: "discord_bot_token",
    label: "Discord Bot Token",
    pattern: /\b([MNO][A-Za-z0-9_-]{23}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27})(?![\w-])/g,
    confidence: "medium",
    reason: "Discord bot token layout (<id>.<timestamp>.<hmac>)",
  },
  {
    id: "telegram_bot_token",
    label: "Telegram Bot Token",
    pattern: /\b(\d{8,10}:AA[A-Za-z0-9_-]{33})(?![\w-])/g,
    confidence: "high",
    reason: "Telegram bot token layout (<bot id>:AA<35 chars>)",
  },
  {
    id: "stripe_secret_key",
    label: "Stripe Secret Key",
    pattern: /\b(sk_live_[A-Za-z0-9]{20,})\b/g,
    confidence: "high",
    reason: "Stripe live-mode secret key prefix (sk_live_)",
  },
  {
    id: "stripe_restricted_key",
    label: "Stripe Restricted Key",
    pattern: /\b(rk_live_[A-Za-z0-9]{20,})\b/g,
    confidence: "high",
    reason: "Stripe live-mode restricted key prefix (rk_live_)",
  },
  {
    id: "stripe_test_secret_key",
    label: "Stripe Test Secret Key",
    pattern: /\b(sk_test_[A-Za-z0-9]{20,})\b/g,
    confidence: "low",
    reason: "Stripe test-mode key — real format, but it cannot move live money",
  },
  {
    id: "sendgrid_api_key",
    label: "SendGrid API Key",
    pattern: /\b(SG\.[A-Za-z0-9_-]{16,32}\.[A-Za-z0-9_-]{16,64})(?![\w-])/g,
    confidence: "high",
    reason: "SendGrid key layout (SG.<id>.<secret>)",
  },
  {
    id: "brevo_api_key",
    label: "Brevo (Sendinblue) API Key",
    pattern: /\b(xkeysib-[a-f0-9]{64}-[A-Za-z0-9]{16})\b/g,
    confidence: "high",
    reason: "Brevo key prefix (xkeysib-) with 64 hex characters",
  },
  {
    id: "mailgun_api_key",
    label: "Mailgun API Key",
    pattern: /\b(key-[a-f0-9]{32})\b/g,
    confidence: "high",
    reason: "Mailgun key prefix (key-) followed by 32 hex characters",
  },
  {
    id: "mailchimp_api_key",
    label: "Mailchimp API Key",
    pattern: /\b([a-f0-9]{32}-us\d{1,2})\b/g,
    confidence: "high",
    reason: "Mailchimp key layout (32 hex characters plus a -us<n> datacentre suffix)",
  },
  {
    id: "twilio_api_key",
    label: "Twilio API Key",
    pattern: /\b(SK[a-f0-9]{32})\b/g,
    confidence: "high",
    reason: "Twilio API key prefix (SK) followed by 32 hex characters",
  },
  {
    id: "shopify_token",
    label: "Shopify Access Token",
    pattern: /\b(shp(?:at|ss|ca|pa)_[a-fA-F0-9]{32})\b/g,
    confidence: "high",
    reason: "Shopify token prefix (shpat_/shpss_/shpca_/shppa_)",
  },
  {
    id: "square_token",
    label: "Square Access Token",
    pattern: /\b(sq0(?:atp|csp)-[A-Za-z0-9_-]{22,43})(?![\w-])/g,
    confidence: "high",
    reason: "Square token prefix (sq0atp-/sq0csp-)",
  },
  {
    id: "linear_api_key",
    label: "Linear API Key",
    pattern: /\b(lin_api_[A-Za-z0-9]{40})\b/g,
    confidence: "high",
    reason: "Linear key prefix (lin_api_) followed by 40 characters",
  },
  {
    id: "notion_token",
    label: "Notion Integration Token",
    pattern: /\b((?:secret_[A-Za-z0-9]{43}|ntn_[A-Za-z0-9]{40,}))\b/g,
    confidence: "high",
    reason: "Notion integration token prefix (secret_ / ntn_)",
  },
  {
    id: "figma_token",
    label: "Figma Personal Access Token",
    pattern: /\b(figd_[A-Za-z0-9_-]{40,})(?![\w-])/g,
    confidence: "high",
    reason: "Figma token prefix (figd_)",
  },
  {
    id: "airtable_pat",
    label: "Airtable Personal Access Token",
    pattern: /\b(pat[A-Za-z0-9]{14}\.[a-f0-9]{64})\b/g,
    confidence: "high",
    reason: "Airtable token layout (pat<14>.<64 hex>)",
  },
  {
    id: "atlassian_token",
    label: "Atlassian API Token",
    pattern: /\b(ATATT3[A-Za-z0-9_=-]{20,})(?![\w=-])/g,
    confidence: "high",
    reason: "Atlassian API token prefix (ATATT3)",
  },
  {
    id: "doppler_token",
    label: "Doppler Token",
    pattern: /\b(dp\.pt\.[A-Za-z0-9]{40,44})\b/g,
    confidence: "high",
    reason: "Doppler personal token prefix (dp.pt.)",
  },
  {
    id: "grafana_token",
    label: "Grafana Token",
    pattern: /\b(gl(?:sa|c)_[A-Za-z0-9_]{32,})\b/g,
    confidence: "high",
    reason: "Grafana service-account / cloud token prefix (glsa_ / glc_)",
  },
  {
    id: "databricks_token",
    label: "Databricks Token",
    pattern: /\b(dapi[a-f0-9]{32})\b/g,
    confidence: "high",
    reason: "Databricks token prefix (dapi) followed by 32 hex characters",
  },
  {
    id: "dynatrace_token",
    label: "Dynatrace Token",
    pattern: /\b(dt0c01\.[A-Z0-9]{24}\.[A-Za-z0-9]{64})\b/g,
    confidence: "high",
    reason: "Dynatrace token layout (dt0c01.<public id>.<secret>)",
  },
  {
    id: "planetscale_token",
    label: "PlanetScale Token",
    pattern: /\b(pscale_(?:tkn|pw|oauth)_[A-Za-z0-9_.-]{32,})(?![\w.-])/g,
    confidence: "high",
    reason: "PlanetScale token prefix (pscale_tkn_/pscale_pw_/pscale_oauth_)",
  },
  {
    id: "supabase_pat",
    label: "Supabase Personal Access Token",
    pattern: /\b(sbp_[a-f0-9]{40})\b/g,
    confidence: "high",
    reason: "Supabase token prefix (sbp_) followed by 40 hex characters",
  },
  {
    id: "new_relic_key",
    label: "New Relic API Key",
    pattern: /\b(NRAK-[A-Z0-9]{27})\b/g,
    confidence: "high",
    reason: "New Relic user key prefix (NRAK-)",
  },
  {
    id: "flyio_token",
    label: "Fly.io Token",
    pattern: /\b(fo1_[A-Za-z0-9_-]{43})(?![\w-])/g,
    confidence: "medium",
    reason: "Fly.io token prefix (fo1_)",
  },
  {
    id: "vercel_blob_token",
    label: "Vercel Blob Read-Write Token",
    pattern: /\b(vercel_blob_rw_[A-Za-z0-9]{20,}_[A-Za-z0-9]{20,})\b/g,
    confidence: "medium",
    reason: "Vercel Blob read-write token prefix (vercel_blob_rw_)",
  },
  {
    id: "huggingface_token",
    label: "Hugging Face Token",
    pattern: /\b(hf_[A-Za-z0-9]{34})\b/g,
    confidence: "high",
    reason: "Hugging Face token prefix (hf_) followed by 34 characters",
  },

  // ── model providers ──────────────────────────────────────────────────
  {
    id: "openai_api_key",
    label: "OpenAI API Key",
    pattern: /\b(sk-(?:proj-)?[A-Za-z0-9_-]{16,}T3BlbkFJ[A-Za-z0-9_-]{16,})(?![\w-])/g,
    confidence: "high",
    reason: "OpenAI key carries the T3BlbkFJ marker segment",
  },
  {
    id: "anthropic_api_key",
    label: "Anthropic API Key",
    pattern: /\b(sk-ant-[a-z0-9]+-[A-Za-z0-9_-]{40,})(?![\w-])/g,
    confidence: "high",
    reason: "Anthropic key prefix (sk-ant-<variant>-)",
  },
  {
    id: "openrouter_api_key",
    label: "OpenRouter API Key",
    pattern: /\b(sk-or-v1-[a-f0-9]{64})\b/g,
    confidence: "high",
    reason: "OpenRouter key prefix (sk-or-v1-) followed by 64 hex characters",
  },
  {
    id: "generic_sk_key",
    label: "Provider Secret Key (sk- prefixed)",
    pattern: /\b(sk-[A-Za-z0-9_-]{16,})(?![\w-])/g,
    confidence: "medium",
    reason: "sk- prefixed provider key, but no vendor-specific marker to pin it down",
    // Only ids this catalog actually carries: a candidate the caller cannot
    // resolve to a label is noise dressed as a lead.
    ambiguousWith: ["openai_api_key", "anthropic_api_key", "openrouter_api_key"],
  },

  // ── generic credential material ──────────────────────────────────────
  {
    id: "private_key_block",
    label: "Private Key Block",
    pattern: /(-----BEGIN (?:RSA |DSA |EC |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-----)/g,
    confidence: "high",
    mask: "marker",
    reason: "PEM private-key header — the block below it is key material",
  },
  {
    id: "age_secret_key",
    label: "age Secret Key",
    pattern: /\b(AGE-SECRET-KEY-1[0-9A-Z]{58})\b/g,
    confidence: "high",
    reason: "age identity prefix (AGE-SECRET-KEY-1)",
  },
  {
    id: "bcrypt_hash",
    label: "bcrypt Password Hash",
    pattern: /(\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53})/g,
    confidence: "medium",
    reason: "bcrypt hash — not a live key, but password material that should not be shared",
  },
  {
    id: "jwt",
    label: "JSON Web Token",
    pattern: /\b(eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})(?![\w-])/g,
    confidence: "medium",
    reason: "three-segment JWT; often a bearer/session token, sometimes a public claim set",
  },
  {
    id: "connection_string_password",
    label: "Password in Connection URL",
    pattern: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/]{1,64}:([^\s:@/]{3,128})@[^\s/]+/gi,
    confidence: "high",
    reason: "password embedded in a connection URL (postgres/mysql/mongodb/https basic auth)",
  },
  {
    id: "authorization_bearer",
    label: "Authorization Bearer Token",
    pattern: /authorization["'\s]*[:=]+\s*["']?bearer\s+([A-Za-z0-9._-]{20,})(?![\w.-])/gi,
    confidence: "medium",
    reason: "bearer token on an Authorization header",
  },
  {
    id: "facebook_access_token",
    label: "Facebook Access Token",
    pattern: /\b(EAA[A-Za-z0-9]{90,})\b/g,
    confidence: "medium",
    reason: "Facebook graph access-token prefix (EAA)",
  },
  {
    id: "wechat_app_secret",
    label: "WeChat AppSecret",
    pattern: /app[_.-]?secret["'\s]*[:=]+\s*["']?([a-f0-9]{32})\b/gi,
    confidence: "high",
    reason: "32 hex characters assigned to an appsecret variable",
  },
  {
    id: "datadog_api_key",
    label: "Datadog API Key",
    pattern: /(?:dd|datadog)[_.-]?api[_.-]?key["'\s]*[:=]+\s*["']?([a-f0-9]{32})\b/gi,
    confidence: "high",
    reason: "32 hex characters assigned to a Datadog api key variable",
  },
  {
    id: "algolia_admin_key",
    label: "Algolia Admin API Key",
    pattern:
      /algolia[_.-]?(?:admin[_.-]?)?(?:api[_.-]?)?key["'\s]*[:=]+\s*["']?([A-Za-z0-9]{32})\b/gi,
    confidence: "high",
    reason: "32 characters assigned to an Algolia key variable",
  },
];

/** Rule ids, exported so callers can enumerate coverage without the regexes. */
export const SECRET_RULE_IDS: readonly string[] = RULES.map((r) => r.id);

const RULE_LABELS: ReadonlyMap<string, string> = new Map(RULES.map((r) => [r.id, r.label]));

/* ── entropy, masking, placeholder suppression ──────────────────────────── */

/** Shannon entropy in bits per character. `H = -Σ p·log2(p)`. */
export function shannonEntropy(value: string): number {
  if (value.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const ch of value) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let total = 0;
  for (const count of freq.values()) {
    const p = count / value.length;
    total -= p * Math.log2(p);
  }
  return total;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Show enough to recognise the credential, never enough to use it. At most 10
 * original characters survive, and short values survive not at all.
 */
export function maskSecret(value: string): string {
  const len = value.length;
  if (len === 0) return "";
  if (len <= 8) return "•".repeat(len);
  if (len <= 20) return `${value.slice(0, 3)}…${value.slice(len - 2)}`;
  return `${value.slice(0, 6)}…${value.slice(len - 4)}`;
}

const PLACEHOLDER_MARKERS: readonly string[] = [
  "example",
  "your-",
  "your_",
  "yourapi",
  "yourkey",
  "yourtoken",
  "changeme",
  "change-me",
  "placeholder",
  "dummy",
  "notarealkey",
  "replace-me",
  "replaceme",
  "redacted",
  "insert-your",
  "insertyour",
  "todo",
  "fixme",
];

const SEQUENTIAL_RUNS: readonly string[] = ["0123456789", "abcdefghij", "ABCDEFGHIJ", "9876543210"];

/**
 * §7 rule 4 — the paste-tool stand-in for gitleaks' allowlists. Sample code,
 * docs and `.env.example` files are full of real-shaped fake keys; a detector
 * that shouts about `AKIAIOSFODNN7EXAMPLE` is a detector nobody reads twice.
 */
export function isPlaceholderSecret(value: string): boolean {
  const lower = value.toLowerCase();
  if (PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker))) return true;
  // 8+ of the same character in a row: `sk-xxxxxxxx…`, `AAAAAAAA…`, `0000…`.
  if (/(.)\1{7,}/.test(value)) return true;
  if (SEQUENTIAL_RUNS.some((run) => value.includes(run))) return true;
  if (shannonEntropy(value) < 2) return true;
  return false;
}

/** Shapes that several vendors share byte-for-byte (§7 rule 3). */
function shapeCandidates(value: string): readonly string[] {
  if (/^[a-f0-9]{32}$/.test(value)) {
    return ["mailgun_api_key", "datadog_api_key", "algolia_admin_key", "generic_md5_hex"];
  }
  if (/^[a-f0-9]{40}$/.test(value)) {
    return ["sonarqube_token", "supabase_pat", "generic_sha1_hex"];
  }
  if (/^[A-Za-z0-9+/]{40}={0,2}$/.test(value)) {
    return ["aws_secret_access_key", "generic_base64_secret"];
  }
  return [];
}

/* ── position helpers ───────────────────────────────────────────────────── */

function lineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) starts.push(i + 1);
  }
  return starts;
}

function locate(starts: readonly number[], offset: number): { line: number; column: number } {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((starts[mid] as number) <= offset) lo = mid;
    else hi = mid - 1;
  }
  return { line: lo + 1, column: offset - (starts[lo] as number) + 1 };
}

/* ── scan ───────────────────────────────────────────────────────────────── */

interface RawMatch {
  start: number;
  end: number;
  value: string;
  type: string;
  label: string;
  confidence: SecretConfidence;
  reason: string;
  candidates: readonly string[];
  mask: "value" | "marker";
  entropy?: number;
  contextKey?: string;
  /** Vendor rules outrank generic passes when two matches overlap. */
  vendor: boolean;
}

const CONFIDENCE_RANK: Record<SecretConfidence, number> = { high: 3, medium: 2, low: 1 };

/** Names that make a high-entropy value a near-certain credential (§7 rule 2). */
const SECRET_NAME =
  /(secret|token|passwd|password|pwd|credential|api[_.-]?key|access[_.-]?key|private[_.-]?key|client[_.-]?secret|auth[_.-]?key|signing[_.-]?key|encryption[_.-]?key|_key$|^key$)/i;
const PASSWORD_NAME = /(passwd|password|pwd|secret|credential)/i;

const ASSIGNMENT =
  /([A-Za-z_][A-Za-z0-9_.-]{1,63})\s*(?::=|=>|[:=])\s*(["'`]?)([A-Za-z0-9+/=_.~-]{8,512})\2/g;
const BARE_TOKEN = /[A-Za-z0-9+/=_-]{40,}/g;

function truncateToBytes(text: string, maxBytes: number): { text: string; truncated: boolean } {
  const encoded = new TextEncoder().encode(text);
  if (encoded.length <= maxBytes) return { text, truncated: false };
  const head = encoded.subarray(0, maxBytes);
  // `fatal: false` — a cut multi-byte character becomes U+FFFD rather than a
  // thrown error. A capped scan is still a scan; a crash is not.
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(head);
  return { text: decoded, truncated: true };
}

/**
 * The whole engine. Pure: same text in, byte-identical findings out. No
 * network, no filesystem, no clock, no randomness — a detector that phones
 * home to check a key it just found is the one thing this root may not do.
 */
export function scanSecrets(input: SecretScanInput): SecretScanOutput {
  const { text: scanned, truncated } = truncateToBytes(input.text, input.maxBytes);
  const starts = lineStarts(scanned);
  const raw: RawMatch[] = [];
  let suppressed = 0;

  const record = (match: RawMatch | null) => {
    if (!match) return;
    if (match.mask === "value" && isPlaceholderSecret(match.value)) {
      suppressed += 1;
      return;
    }
    raw.push(match);
  };

  // 1. vendor-prefix catalog.
  for (const rule of RULES) {
    // `d` (hasIndices) so the capture group's real position is read from the
    // engine. Searching the match text for the captured string instead lands on
    // the wrong offset whenever the value repeats inside it — a connection URL
    // whose user and password are the same string reported the *username's*
    // column, pointing the user at the wrong characters to redact.
    const re = new RegExp(rule.pattern.source, `${rule.pattern.flags}d`);
    const groupIndex = rule.group ?? 1;
    let m = re.exec(scanned);
    while (m !== null) {
      const value = m[groupIndex] ?? m[0];
      const span = m.indices?.[groupIndex] ?? m.indices?.[0];
      const offset = span ? span[0] : m.index + m[0].indexOf(value);
      record({
        start: offset,
        end: offset + value.length,
        value,
        type: rule.id,
        label: rule.label,
        confidence: rule.confidence,
        reason: rule.reason,
        candidates: rule.ambiguousWith ?? [],
        mask: rule.mask ?? "value",
        vendor: true,
      });
      // Zero-length matches cannot happen with these patterns, but a stalled
      // lastIndex would hang the page — advance defensively.
      if (re.lastIndex === m.index) re.lastIndex += 1;
      m = re.exec(scanned);
    }
  }

  // 2. assignment + entropy pass — the half "regex is all you need" misses.
  {
    const re = new RegExp(ASSIGNMENT.source, ASSIGNMENT.flags);
    let m = re.exec(scanned);
    while (m !== null) {
      const name = m[1] as string;
      const quote = m[2] ?? "";
      const value = m[3] as string;
      const offset = m.index + m[0].length - value.length - quote.length;
      const entropy = shannonEntropy(value);
      const named = SECRET_NAME.test(name);
      record(buildContextFinding({ name, value, offset, entropy, named }));
      if (re.lastIndex === m.index) re.lastIndex += 1;
      m = re.exec(scanned);
    }
  }

  // 3. bare high-entropy tokens — a key pasted on its own line has no variable
  //    name to lean on, so the bar is deliberately higher.
  {
    const re = new RegExp(BARE_TOKEN.source, BARE_TOKEN.flags);
    let m = re.exec(scanned);
    while (m !== null) {
      const value = m[0];
      const entropy = shannonEntropy(value);
      if (entropy >= 4.5) {
        record({
          start: m.index,
          end: m.index + value.length,
          value,
          type: "generic_high_entropy",
          label: "High-Entropy String",
          confidence: "low",
          reason: `entropy ${round1(entropy)} bits/char over ${value.length} characters, with no credential-like variable name nearby`,
          candidates: shapeCandidates(value),
          mask: "value",
          entropy: round1(entropy),
          vendor: false,
        });
      }
      if (re.lastIndex === m.index) re.lastIndex += 1;
      m = re.exec(scanned);
    }
  }

  const findings = resolve(raw, starts);
  const kept = input.includeLowConfidence
    ? findings
    : findings.filter((f) => f.confidence !== "low");
  const limited = kept.slice(0, input.maxFindings);

  return {
    verdict: limited.length > 0 ? "found" : "clean",
    findingCount: limited.length,
    findings: limited,
    truncated,
    scannedBytes: new TextEncoder().encode(scanned).length,
    lineCount: starts.length,
    suppressedCount: suppressed,
    omittedCount: kept.length - limited.length,
    counts: {
      high: limited.filter((f) => f.confidence === "high").length,
      medium: limited.filter((f) => f.confidence === "medium").length,
      low: limited.filter((f) => f.confidence === "low").length,
    },
  };
}

/**
 * §7 rule 2 in one place: identical bytes, different verdict depending on the
 * variable they are assigned to.
 */
function buildContextFinding(args: {
  name: string;
  value: string;
  offset: number;
  entropy: number;
  named: boolean;
}): RawMatch | null {
  const { name, value, offset, entropy, named } = args;
  const base = {
    start: offset,
    end: offset + value.length,
    value,
    mask: "value" as const,
    entropy: round1(entropy),
    candidates: shapeCandidates(value),
    vendor: false,
  };

  if (!named) {
    // No credential-shaped name: only an unusually random long string is worth
    // mentioning at all, and only ever at low confidence.
    if (entropy < 4.5 || value.length < 32) return null;
    return {
      ...base,
      type: "generic_high_entropy",
      label: "High-Entropy String",
      confidence: "low",
      reason: `entropy ${round1(entropy)} bits/char, but assigned to "${name}", which does not read as a credential`,
      contextKey: name,
    };
  }

  if (entropy >= 4.2 && value.length >= 32) {
    return {
      ...base,
      type: "generic_api_key",
      label: "Generic API Key or Secret",
      confidence: "high",
      reason: `entropy ${round1(entropy)} bits/char over ${value.length} characters assigned to "${name}"`,
      contextKey: name,
    };
  }
  if (entropy >= 3.5 && value.length >= 20) {
    return {
      ...base,
      type: "generic_api_key",
      label: "Generic API Key or Secret",
      confidence: "medium",
      reason: `entropy ${round1(entropy)} bits/char over ${value.length} characters assigned to "${name}"`,
      contextKey: name,
    };
  }
  if (PASSWORD_NAME.test(name)) {
    return {
      ...base,
      type: "hardcoded_password",
      label: "Hard-Coded Password",
      confidence: "low",
      reason: `low-entropy value (${round1(entropy)} bits/char) assigned to "${name}" — reads as a literal password`,
      contextKey: name,
    };
  }
  return null;
}

/**
 * Overlapping matches describe one secret, not several. Keep the strongest
 * claim and demote the rest to candidates — the honest answer for a shape
 * several vendors share (§7 rule 3).
 */
function resolve(raw: readonly RawMatch[], starts: readonly number[]): SecretFinding[] {
  const ordered = [...raw].sort((a, b) => a.start - b.start || b.end - a.end);
  const groups: RawMatch[][] = [];
  let current: RawMatch[] = [];
  let currentEnd = -1;

  for (const match of ordered) {
    if (current.length > 0 && match.start < currentEnd) {
      current.push(match);
      currentEnd = Math.max(currentEnd, match.end);
      continue;
    }
    if (current.length > 0) groups.push(current);
    current = [match];
    currentEnd = match.end;
  }
  if (current.length > 0) groups.push(current);

  const findings: SecretFinding[] = [];
  for (const group of groups) {
    const primary = [...group].sort(
      (a, b) =>
        Number(b.vendor) - Number(a.vendor) ||
        CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence] ||
        b.value.length - a.value.length ||
        a.type.localeCompare(b.type),
    )[0] as RawMatch;

    const candidates = new Set<string>(primary.candidates);
    for (const other of group) {
      if (other.type !== primary.type && other.vendor) candidates.add(other.type);
    }
    candidates.delete(primary.type);

    const { line, column } = locate(starts, primary.start);
    const finding: {
      -readonly [K in keyof SecretFinding]: SecretFinding[K];
    } = {
      type: primary.type,
      label: primary.label,
      confidence: primary.confidence,
      line,
      column,
      maskedValue: primary.mask === "marker" ? primary.value : maskSecret(primary.value),
      valueLength: primary.value.length,
      reason: primary.reason,
    };
    if (candidates.size > 0) finding.candidates = [...candidates].sort();
    if (primary.entropy !== undefined) finding.entropy = primary.entropy;
    if (primary.contextKey !== undefined) finding.contextKey = primary.contextKey;
    findings.push(finding);
  }

  return findings.sort(
    (a, b) =>
      CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence] ||
      a.line - b.line ||
      a.column - b.column ||
      a.type.localeCompare(b.type),
  );
}

/** Vendor label for a rule id, for callers rendering a `candidates` list. */
export function secretRuleLabel(id: string): string | undefined {
  return RULE_LABELS.get(id);
}

/* ── tool definition ────────────────────────────────────────────────────── */

export const secretScanTool = tool({
  id: "dev/secret-scan",
  slug: "secret-scan",
  category: "dev",
  title: { zh: "密钥泄露检测", en: "Secret & API Key Scanner" },
  description: {
    zh: "粘贴 .env、配置、日志或代码，检出疑似 API Key / Token / 私钥：正则指纹 + 熵值 + 变量名上下文，只读不验证，命中值默认脱敏并给出行号",
    en: "Paste a .env, config, log or code snippet and find API keys, tokens and private keys — vendor patterns plus entropy and variable-name context, values masked by default, read-only and never verified against any vendor",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server", "client"],
  meterId: "forge.dev.secret_scan",
  roots: ["detector", "analyzer"],
  engine: {
    name: "forge-secret-scan",
    upstream:
      "gitleaks rule corpus (github.com/gitleaks/gitleaks, MIT) — vendor-prefix patterns · Shannon entropy (C. E. Shannon, A Mathematical Theory of Communication, 1948) · RFC 7519 (JWT) · RFC 7468 (PEM textual encodings) · RFC 3986 §3.2.1 (userinfo in URIs)",
    version: "1.0.0",
  },
  seoKeywords: {
    zh: "密钥泄露检测,API密钥扫描,密钥扫描工具,检测代码里的密钥,token泄露检查,secret扫描在线",
    en: "secret scanner online, api key detector, find leaked api key, scan code for secrets, secret detection tool, check env file for secrets",
  },
  inputSchema: secretScanInputSchema,
  execute: (input: SecretScanInput) => scanSecrets(input),
});

export const w3SecretScanTools: readonly AnyForgeToolDefinition[] = [secretScanTool];
