import fs from "node:fs";
import path from "node:path";

import {
  EMAIL_PROVIDERS,
  type EmailProviderId,
  type EmailProviderMeta,
  type EmailRegion,
  getEmailProvider,
} from "./email-meta.js";

/**
 * Email selection applier for create-sailor.
 *
 * Generates a `packages/email` workspace package in the scaffolded project
 * with a real SDK wrapper for the chosen provider. L3 depth: wrappers call
 * the actual SDK API — not stubs, not TODOs. Retries, metrics, and tests are
 * explicitly out of scope (those belong to L4 in the email primitive package).
 *
 * Behaviour:
 *  - `none`                → no-op (user will bring their own).
 *  - any concrete provider → overwrite `packages/email/{package.json,src/*}`
 *                            and append env vars to `.env.example`.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const WORKSPACE_PACKAGE_NAME = "@nebutra/email";

// ─── Filesystem helpers ─────────────────────────────────────────────────────

function writeFile(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function appendEnv(targetDir: string, block: string): void {
  const envExamplePath = path.join(targetDir, ".env.example");
  if (fs.existsSync(envExamplePath)) {
    fs.appendFileSync(envExamplePath, "\n" + block);
  } else {
    fs.writeFileSync(envExamplePath, block);
  }
}

function envBlockFor(provider: EmailProviderMeta): string {
  if (provider.envVars.length === 0) return "";
  const header = `# Email provider: ${provider.name}`;
  const lines = provider.envVars.map((k) => `${k}=`).join("\n");
  return `${header}\n${lines}\n`;
}

// ─── Shared type file ───────────────────────────────────────────────────────

const TYPES_SOURCE = `/**
 * Public inputs accepted by the \`sendEmail\` wrapper.
 * Keep the surface minimal — individual providers may accept more, but
 * consumers should code against this shape for portability.
 */
export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  /** Provider-specific message identifier, when available. */
  id?: string;
  /** Raw provider response — useful for debugging, not a stable contract. */
  raw?: unknown;
}
`;

// ─── Provider-specific index.ts bodies (L3 wrappers) ────────────────────────

function indexForResend(): string {
  return `/**
 * @${WORKSPACE_PACKAGE_NAME.slice(1)} — Resend transactional email wrapper.
 *
 * Docs: https://resend.com/docs
 */
import { Resend } from "resend";

import type { SendEmailInput, SendEmailResult } from "./types.js";

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  throw new Error("RESEND_API_KEY not configured");
}

const resend = new Resend(apiKey);

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from = input.from ?? process.env.RESEND_FROM;
  if (!from) {
    throw new Error("RESEND_FROM (or input.from) must be provided");
  }

  const { data, error } = await resend.emails.send({
    from,
    to: Array.isArray(input.to) ? input.to : [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
  });

  if (error) {
    throw new Error(\`Resend send failed: \${error.message}\`);
  }

  return { id: data?.id, raw: data };
}

export type { SendEmailInput, SendEmailResult } from "./types.js";
`;
}

function indexForPostmark(): string {
  return `/**
 * @${WORKSPACE_PACKAGE_NAME.slice(1)} — Postmark transactional email wrapper.
 *
 * Docs: https://postmarkapp.com/developer
 */
import { ServerClient } from "postmark";

import type { SendEmailInput, SendEmailResult } from "./types.js";

const apiKey = process.env.POSTMARK_API_KEY;
if (!apiKey) {
  throw new Error("POSTMARK_API_KEY not configured");
}

const client = new ServerClient(apiKey);

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from = input.from ?? process.env.POSTMARK_FROM;
  if (!from) {
    throw new Error("POSTMARK_FROM (or input.from) must be provided");
  }

  const to = Array.isArray(input.to) ? input.to.join(", ") : input.to;

  const response = await client.sendEmail({
    From: from,
    To: to,
    Subject: input.subject,
    HtmlBody: input.html,
    TextBody: input.text,
    ReplyTo: input.replyTo,
    MessageStream: "outbound",
  });

  return { id: response.MessageID, raw: response };
}

export type { SendEmailInput, SendEmailResult } from "./types.js";
`;
}

function indexForSes(): string {
  return `/**
 * @${WORKSPACE_PACKAGE_NAME.slice(1)} — AWS SES v2 transactional email wrapper.
 *
 * Docs: https://docs.aws.amazon.com/ses
 */
import {
  SendEmailCommand,
  SESv2Client,
} from "@aws-sdk/client-sesv2";

import type { SendEmailInput, SendEmailResult } from "./types.js";

const region = process.env.AWS_SES_REGION;
if (!region) {
  throw new Error("AWS_SES_REGION not configured");
}

const client = new SESv2Client({
  region,
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from = input.from ?? process.env.SES_FROM;
  if (!from) {
    throw new Error("SES_FROM (or input.from) must be provided");
  }

  const toAddresses = Array.isArray(input.to) ? input.to : [input.to];

  const command = new SendEmailCommand({
    FromEmailAddress: from,
    Destination: { ToAddresses: toAddresses },
    ReplyToAddresses: input.replyTo ? [input.replyTo] : undefined,
    Content: {
      Simple: {
        Subject: { Data: input.subject, Charset: "UTF-8" },
        Body: {
          ...(input.html ? { Html: { Data: input.html, Charset: "UTF-8" } } : {}),
          ...(input.text ? { Text: { Data: input.text, Charset: "UTF-8" } } : {}),
        },
      },
    },
  });

  const response = await client.send(command);
  return { id: response.MessageId, raw: response };
}

export type { SendEmailInput, SendEmailResult } from "./types.js";
`;
}

function indexForAliyunDm(): string {
  return `/**
 * @${WORKSPACE_PACKAGE_NAME.slice(1)} — 阿里云邮件推送 (Aliyun DirectMail) wrapper.
 *
 * Docs: https://help.aliyun.com/product/29412.html
 */
import Dm20151123, * as $Dm20151123 from "@alicloud/dm20151123";
import * as $OpenApi from "@alicloud/openapi-client";

import type { SendEmailInput, SendEmailResult } from "./types.js";

const accessKeyId = process.env.ALIYUN_DM_ACCESS_KEY;
const accessKeySecret = process.env.ALIYUN_DM_ACCESS_SECRET;
if (!accessKeyId || !accessKeySecret) {
  throw new Error(
    "ALIYUN_DM_ACCESS_KEY and ALIYUN_DM_ACCESS_SECRET must be configured",
  );
}

const config = new $OpenApi.Config({
  accessKeyId,
  accessKeySecret,
  endpoint: "dm.aliyuncs.com",
});

const client = new Dm20151123.default(config);

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const accountName = process.env.ALIYUN_DM_ACCOUNT_NAME;
  if (!accountName) {
    throw new Error("ALIYUN_DM_ACCOUNT_NAME must be configured");
  }

  const toAddress = Array.isArray(input.to) ? input.to.join(",") : input.to;

  const req = new $Dm20151123.SingleSendMailRequest({
    accountName,
    addressType: 1,
    replyToAddress: false,
    toAddress,
    subject: input.subject,
    htmlBody: input.html,
    textBody: input.text,
    fromAlias: process.env.ALIYUN_DM_FROM_ALIAS,
  });

  const response = await client.singleSendMail(req);
  return { id: response.body?.requestId, raw: response };
}

export type { SendEmailInput, SendEmailResult } from "./types.js";
`;
}

function indexForTencentSes(): string {
  return `/**
 * @${WORKSPACE_PACKAGE_NAME.slice(1)} — 腾讯云 SES wrapper.
 *
 * Docs: https://cloud.tencent.com/document/product/1288
 */
import tencentcloud from "tencentcloud-sdk-nodejs-ses";

import type { SendEmailInput, SendEmailResult } from "./types.js";

const secretId = process.env.TENCENT_SECRET_ID;
const secretKey = process.env.TENCENT_SECRET_KEY;
if (!secretId || !secretKey) {
  throw new Error("TENCENT_SECRET_ID and TENCENT_SECRET_KEY must be configured");
}

const SesClient = tencentcloud.ses.v20201002.Client;

const client = new SesClient({
  credential: { secretId, secretKey },
  region: "ap-hongkong",
  profile: {
    httpProfile: { endpoint: "ses.tencentcloudapi.com" },
  },
});

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from = input.from ?? process.env.TENCENT_SES_FROM_EMAIL;
  if (!from) {
    throw new Error("TENCENT_SES_FROM_EMAIL (or input.from) must be provided");
  }

  const destination = Array.isArray(input.to) ? input.to : [input.to];

  const response = await client.SendEmail({
    FromEmailAddress: from,
    Destination: destination,
    Subject: input.subject,
    ReplyToAddresses: input.replyTo,
    Simple: {
      Html: input.html,
      Text: input.text,
    },
  });

  return { id: response.MessageId, raw: response };
}

export type { SendEmailInput, SendEmailResult } from "./types.js";
`;
}

function indexForNetease(): string {
  return `/**
 * @${WORKSPACE_PACKAGE_NAME.slice(1)} — 网易企业邮箱 via SMTP (nodemailer).
 *
 * Docs: https://qiye.163.com/help
 */
import nodemailer from "nodemailer";

import type { SendEmailInput, SendEmailResult } from "./types.js";

const user = process.env.NETEASE_USER;
const pass = process.env.NETEASE_PASS;
if (!user || !pass) {
  throw new Error("NETEASE_USER and NETEASE_PASS must be configured");
}

const transporter = nodemailer.createTransport({
  host: "smtp.qiye.163.com",
  port: 465,
  secure: true,
  auth: { user, pass },
});

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from = input.from ?? process.env.NETEASE_FROM ?? user;

  const response = await transporter.sendMail({
    from,
    to: Array.isArray(input.to) ? input.to.join(", ") : input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
  });

  return { id: response.messageId, raw: response };
}

export type { SendEmailInput, SendEmailResult } from "./types.js";
`;
}

function indexForProvider(id: EmailProviderId): string {
  switch (id) {
    case "resend":
      return indexForResend();
    case "postmark":
      return indexForPostmark();
    case "ses":
      return indexForSes();
    case "aliyun-dm":
      return indexForAliyunDm();
    case "tencent-ses":
      return indexForTencentSes();
    case "netease":
      return indexForNetease();
    case "none":
      return "export {};\n";
  }
}

// ─── package.json generator ─────────────────────────────────────────────────

function packageJsonFor(provider: EmailProviderMeta): string {
  const dependencies: Record<string, string> = {};
  if (provider.pkg && provider.pkgVersion) {
    dependencies[provider.pkg] = provider.pkgVersion;
  }

  // The AWS SES wrapper imports both the SES v2 client AND
  // `@aws-sdk/client-sesv2`, no extras needed.
  // The Aliyun DM wrapper also needs the openapi-client peer.
  if (provider.id === "aliyun-dm") {
    dependencies["@alicloud/openapi-client"] = "^0.4.12";
  }

  const pkg = {
    name: WORKSPACE_PACKAGE_NAME,
    version: "0.1.0",
    private: true,
    description: `Transactional email via ${provider.name}`,
    type: "module",
    main: "./dist/index.js",
    exports: {
      ".": {
        import: "./dist/index.js",
        types: "./dist/index.d.ts",
      },
    },
    scripts: {
      build: "tsup",
      typecheck: "tsc --noEmit",
      clean: "rm -rf dist .turbo",
    },
    dependencies,
    devDependencies: {
      tsup: "^8.5.0",
      typescript: "catalog:",
    },
  };

  return JSON.stringify(pkg, null, 2) + "\n";
}

// ─── Public entry point ─────────────────────────────────────────────────────

export async function applyEmailSelection(
  targetDir: string,
  emailId: string,
  _region: string,
): Promise<void> {
  if (emailId === "none") return;

  const provider = getEmailProvider(emailId);
  if (!provider) {
    throw new Error(
      `Unknown email provider "${emailId}". Valid ids: ${EMAIL_PROVIDERS.map((p) => p.id).join(", ")}`,
    );
  }

  const pkgDir = path.join(targetDir, "packages", "email");
  const srcDir = path.join(pkgDir, "src");

  // Overwrite (not merge) per spec: nuke any pre-existing src/ to avoid
  // stale provider wrappers from the template.
  if (fs.existsSync(srcDir)) {
    fs.rmSync(srcDir, { recursive: true, force: true });
  }

  writeFile(path.join(pkgDir, "package.json"), packageJsonFor(provider));
  writeFile(path.join(srcDir, "types.ts"), TYPES_SOURCE);
  writeFile(path.join(srcDir, "index.ts"), indexForProvider(provider.id));

  appendEnv(targetDir, envBlockFor(provider));
}

export type { EmailProviderId, EmailRegion };
