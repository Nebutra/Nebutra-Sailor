import fs from "node:fs";
import path from "node:path";

import {
  getSmsProvider,
  SMS_PROVIDERS,
  type SmsProviderId,
  type SmsProviderMeta,
  type SmsRegion,
} from "./sms-meta.js";

/**
 * SMS selection applier for create-sailor.
 *
 * Generates a `packages/sms` workspace package with a real SDK wrapper
 * exposing `sendSms({to, templateCode, params})` for the chosen provider.
 *
 * L3 depth: wrappers use the actual SDK API — no stubs, no TODOs.
 *
 * SDK versions pinned in generated package.json:
 *   twilio                           ^5.3.6
 *   messagebird                      ^4.0.1
 *   plivo                            ^4.73.0
 *   @alicloud/dysmsapi20170525       ^2.0.24
 *   @alicloud/openapi-client         ^0.4.12
 *   tencentcloud-sdk-nodejs-sms      ^4.0.970
 *   yunpian-nodejs-sdk               ^0.0.2
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const WORKSPACE_PACKAGE_NAME = "@nebutra/sms";

const PKG_VERSIONS: Record<string, string> = {
  twilio: "^5.3.6",
  messagebird: "^4.0.1",
  plivo: "^4.73.0",
  "@alicloud/dysmsapi20170525": "^2.0.24",
  "@alicloud/openapi-client": "^0.4.12",
  "tencentcloud-sdk-nodejs-sms": "^4.0.970",
  "yunpian-nodejs-sdk": "^0.0.2",
};

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

function envBlockFor(provider: SmsProviderMeta): string {
  if (provider.envVars.length === 0) return "";
  const header = `# SMS provider: ${provider.name}`;
  const lines = provider.envVars.map((k) => `${k}=`).join("\n");
  return `${header}\n${lines}\n`;
}

// ─── Shared type file ───────────────────────────────────────────────────────

const TYPES_SOURCE = `/**
 * Inputs for the \`sendSms\` wrapper. Keep this surface portable across
 * providers — provider-specific options belong in the wrapper itself.
 */
export interface SendSmsInput {
  /** E.164 (+1415...) for global providers, or 11-digit string for CN providers. */
  to: string;
  /** Template code / ID registered with the provider. */
  templateCode?: string;
  /** Template variables — usually { code: "123456" } or { name, orderId, ... }. */
  params?: Record<string, string | number>;
  /** Free-form text body (only honored by providers that allow ad-hoc content). */
  body?: string;
}

export interface SendSmsResult {
  messageId?: string;
  provider: string;
  raw?: unknown;
}
`;

// ─── Provider-specific index.ts bodies (L3 wrappers) ────────────────────────

function indexForTwilio(): string {
  return `import twilio from "twilio";
import type { SendSmsInput, SendSmsResult } from "./types.js";

let client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (client) return client;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set");
  }
  client = twilio(sid, token);
  return client;
}

export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!from) throw new Error("TWILIO_FROM_NUMBER must be set");

  const body =
    input.body ??
    Object.values(input.params ?? {}).join(" ") ??
    "";

  const message = await getClient().messages.create({
    to: input.to,
    from,
    body,
  });

  return { messageId: message.sid, provider: "twilio", raw: message };
}

export type { SendSmsInput, SendSmsResult } from "./types.js";
`;
}

function indexForMessageBird(): string {
  return `import messagebird from "messagebird";
import type { SendSmsInput, SendSmsResult } from "./types.js";

let client: ReturnType<typeof messagebird> | null = null;

function getClient() {
  if (client) return client;
  const key = process.env.MESSAGEBIRD_ACCESS_KEY;
  if (!key) throw new Error("MESSAGEBIRD_ACCESS_KEY must be set");
  client = messagebird(key);
  return client;
}

export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const originator = process.env.MESSAGEBIRD_ORIGINATOR;
  if (!originator) throw new Error("MESSAGEBIRD_ORIGINATOR must be set");

  const body =
    input.body ??
    Object.values(input.params ?? {}).join(" ") ??
    "";

  return await new Promise<SendSmsResult>((resolve, reject) => {
    getClient().messages.create(
      { originator, recipients: [input.to], body },
      (err, response) => {
        if (err) return reject(err);
        resolve({
          messageId: response?.id,
          provider: "messagebird",
          raw: response,
        });
      },
    );
  });
}

export type { SendSmsInput, SendSmsResult } from "./types.js";
`;
}

function indexForPlivo(): string {
  return `import plivo from "plivo";
import type { SendSmsInput, SendSmsResult } from "./types.js";

let client: InstanceType<typeof plivo.Client> | null = null;

function getClient() {
  if (client) return client;
  const authId = process.env.PLIVO_AUTH_ID;
  const authToken = process.env.PLIVO_AUTH_TOKEN;
  if (!authId || !authToken) {
    throw new Error("PLIVO_AUTH_ID and PLIVO_AUTH_TOKEN must be set");
  }
  client = new plivo.Client(authId, authToken);
  return client;
}

export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const from = process.env.PLIVO_FROM_NUMBER;
  if (!from) throw new Error("PLIVO_FROM_NUMBER must be set");

  const body =
    input.body ??
    Object.values(input.params ?? {}).join(" ") ??
    "";

  const response = await getClient().messages.create({
    src: from,
    dst: input.to,
    text: body,
  });

  return {
    messageId: response.messageUuid?.[0],
    provider: "plivo",
    raw: response,
  };
}

export type { SendSmsInput, SendSmsResult } from "./types.js";
`;
}

function indexForAliyunSms(): string {
  return `import Dysmsapi, { SendSmsRequest } from "@alicloud/dysmsapi20170525";
import * as $OpenApi from "@alicloud/openapi-client";
import type { SendSmsInput, SendSmsResult } from "./types.js";

let client: Dysmsapi | null = null;

function getClient(): Dysmsapi {
  if (client) return client;
  const accessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY;
  const accessKeySecret = process.env.ALIYUN_SMS_ACCESS_SECRET;
  if (!accessKeyId || !accessKeySecret) {
    throw new Error(
      "ALIYUN_SMS_ACCESS_KEY and ALIYUN_SMS_ACCESS_SECRET must be set",
    );
  }
  const config = new $OpenApi.Config({ accessKeyId, accessKeySecret });
  config.endpoint = process.env.ALIYUN_SMS_ENDPOINT ?? "dysmsapi.aliyuncs.com";
  client = new Dysmsapi(config);
  return client;
}

export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const signName = process.env.ALIYUN_SMS_SIGN_NAME;
  const templateCode = input.templateCode ?? process.env.ALIYUN_SMS_TEMPLATE_CODE;
  if (!signName) throw new Error("ALIYUN_SMS_SIGN_NAME must be set");
  if (!templateCode) throw new Error("templateCode or ALIYUN_SMS_TEMPLATE_CODE must be provided");

  const req = new SendSmsRequest({
    phoneNumbers: input.to,
    signName,
    templateCode,
    templateParam: JSON.stringify(input.params ?? {}),
  });

  const response = await getClient().sendSms(req);
  const body = response.body;

  if (body?.code !== "OK") {
    throw new Error(\`Aliyun SMS failed: \${body?.code} \${body?.message}\`);
  }

  return {
    messageId: body?.bizId,
    provider: "aliyun-sms",
    raw: body,
  };
}

export type { SendSmsInput, SendSmsResult } from "./types.js";
`;
}

function indexForTencentSms(): string {
  return `import * as tencentcloud from "tencentcloud-sdk-nodejs-sms";
import type { SendSmsInput, SendSmsResult } from "./types.js";

const SmsClient = tencentcloud.sms.v20210111.Client;
type SmsClientInstance = InstanceType<typeof SmsClient>;

let client: SmsClientInstance | null = null;

function getClient(): SmsClientInstance {
  if (client) return client;
  const secretId = process.env.TENCENT_SMS_SECRET_ID;
  const secretKey = process.env.TENCENT_SMS_SECRET_KEY;
  if (!secretId || !secretKey) {
    throw new Error(
      "TENCENT_SMS_SECRET_ID and TENCENT_SMS_SECRET_KEY must be set",
    );
  }

  client = new SmsClient({
    credential: { secretId, secretKey },
    region: process.env.TENCENT_SMS_REGION ?? "ap-guangzhou",
    profile: {
      httpProfile: { endpoint: "sms.tencentcloudapi.com" },
    },
  });
  return client;
}

export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const sdkAppId = process.env.TENCENT_SMS_SDK_APP_ID;
  const signName = process.env.TENCENT_SMS_SIGN_NAME;
  const templateId = input.templateCode ?? process.env.TENCENT_SMS_TEMPLATE_ID;

  if (!sdkAppId) throw new Error("TENCENT_SMS_SDK_APP_ID must be set");
  if (!signName) throw new Error("TENCENT_SMS_SIGN_NAME must be set");
  if (!templateId) {
    throw new Error("templateCode or TENCENT_SMS_TEMPLATE_ID must be provided");
  }

  // Tencent expects phone numbers with + prefix (E.164). Also expects ordered
  // template params as a string array matching the template placeholders.
  const to = input.to.startsWith("+") ? input.to : \`+\${input.to}\`;
  const templateParamSet = Object.values(input.params ?? {}).map(String);

  const response = await getClient().SendSms({
    SmsSdkAppId: sdkAppId,
    SignName: signName,
    TemplateId: templateId,
    PhoneNumberSet: [to],
    TemplateParamSet: templateParamSet,
  });

  const first = response.SendStatusSet?.[0];
  if (first && first.Code !== "Ok") {
    throw new Error(\`Tencent SMS failed: \${first.Code} \${first.Message}\`);
  }

  return {
    messageId: first?.SerialNo,
    provider: "tencent-sms",
    raw: response,
  };
}

export type { SendSmsInput, SendSmsResult } from "./types.js";
`;
}

function indexForYunpian(): string {
  return `// @ts-expect-error — yunpian-nodejs-sdk ships no type declarations
import Yunpian from "yunpian-nodejs-sdk";
import type { SendSmsInput, SendSmsResult } from "./types.js";

let client: { sms: { single_send(opts: unknown): Promise<unknown>; tpl_single_send(opts: unknown): Promise<unknown> } } | null =
  null;

function getClient() {
  if (client) return client;
  const apiKey = process.env.YUNPIAN_API_KEY;
  if (!apiKey) throw new Error("YUNPIAN_API_KEY must be set");
  client = new Yunpian(apiKey);
  return client!;
}

/**
 * Yunpian (云片) supports two modes:
 *   - tpl_single_send: registered template + tpl_value
 *   - single_send:     ad-hoc text (must include registered 签名)
 */
export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const sign = process.env.YUNPIAN_SIGN ?? "";

  if (input.templateCode) {
    const tplValue = Object.entries(input.params ?? {})
      .map(([k, v]) => \`#\${k}#=\${encodeURIComponent(String(v))}\`)
      .join("&");

    const raw = await getClient().sms.tpl_single_send({
      mobile: input.to,
      tpl_id: input.templateCode,
      tpl_value: tplValue,
    });

    return { provider: "yunpian", raw };
  }

  const text = input.body
    ? input.body.startsWith("【")
      ? input.body
      : \`\${sign}\${input.body}\`
    : \`\${sign}\${Object.values(input.params ?? {}).join(" ")}\`;

  const raw = await getClient().sms.single_send({
    mobile: input.to,
    text,
  });

  return { provider: "yunpian", raw };
}

export type { SendSmsInput, SendSmsResult } from "./types.js";
`;
}

function indexForProvider(id: SmsProviderId): string {
  switch (id) {
    case "twilio":
      return indexForTwilio();
    case "messagebird":
      return indexForMessageBird();
    case "plivo":
      return indexForPlivo();
    case "aliyun-sms":
      return indexForAliyunSms();
    case "tencent-sms":
      return indexForTencentSms();
    case "yunpian":
      return indexForYunpian();
    case "none":
      return "export {};\n";
  }
}

// ─── package.json generator ─────────────────────────────────────────────────

function packageJsonFor(provider: SmsProviderMeta): string {
  const dependencies: Record<string, string> = {};
  for (const pkg of provider.pkgs ?? []) {
    const version = PKG_VERSIONS[pkg];
    if (version) dependencies[pkg] = version;
  }

  const pkg = {
    name: WORKSPACE_PACKAGE_NAME,
    version: "0.1.0",
    private: true,
    description: `Transactional SMS via ${provider.name}`,
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

export async function applySmsSelection(
  targetDir: string,
  smsId: string,
  _region: SmsRegion | string = "global",
): Promise<void> {
  if (smsId === "none") return;

  const provider = getSmsProvider(smsId);
  if (!provider) {
    throw new Error(
      `Unknown SMS provider "${smsId}". Valid ids: ${SMS_PROVIDERS.map((p) => p.id).join(", ")}`,
    );
  }

  const pkgDir = path.join(targetDir, "packages", "sms");

  // Silent-skip if template doesn't ship the sms package at all.
  if (!fs.existsSync(pkgDir)) return;

  const srcDir = path.join(pkgDir, "src");

  if (fs.existsSync(srcDir)) {
    fs.rmSync(srcDir, { recursive: true, force: true });
  }

  try {
    writeFile(path.join(pkgDir, "package.json"), packageJsonFor(provider));
    writeFile(path.join(srcDir, "types.ts"), TYPES_SOURCE);
    writeFile(path.join(srcDir, "index.ts"), indexForProvider(provider.id));

    appendEnv(targetDir, envBlockFor(provider));
  } catch (error) {
    console.error(`Failed to apply SMS selection "${smsId}":`, error);
    throw new Error(`SMS scaffold for "${smsId}" failed — see stderr for details.`);
  }
}

export type { SmsProviderId, SmsRegion };
