/**
 * Email provider registry — single source of truth for the create-sailor CLI.
 *
 * Covers 6 concrete transactional email providers (3 global + 3 CN) plus a
 * `none` sentinel for scaffolds that want to bring their own integration.
 */

export type EmailProviderId =
  | "resend"
  | "postmark"
  | "ses"
  | "aliyun-dm"
  | "tencent-ses"
  | "netease"
  | "none";

export type EmailRegion = "global" | "cn";

export interface EmailProviderMeta {
  id: EmailProviderId;
  name: string;
  region: EmailRegion;
  envVars: string[];
  docs: string;
  /** npm package that provides the SDK. Undefined for `none`. */
  pkg?: string;
  /** Package version range to pin in the generated `package.json`. */
  pkgVersion?: string;
}

export const EMAIL_PROVIDERS: EmailProviderMeta[] = [
  // ─── Global ────────────────────────────────────────────────────────────────
  {
    id: "resend",
    name: "Resend",
    region: "global",
    envVars: ["RESEND_API_KEY", "RESEND_FROM"],
    docs: "https://resend.com/docs",
    pkg: "resend",
    pkgVersion: "^4.0.1",
  },
  {
    id: "postmark",
    name: "Postmark",
    region: "global",
    envVars: ["POSTMARK_API_KEY", "POSTMARK_FROM"],
    docs: "https://postmarkapp.com/developer",
    pkg: "postmark",
    pkgVersion: "^4.0.5",
  },
  {
    id: "ses",
    name: "AWS SES",
    region: "global",
    envVars: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SES_REGION", "SES_FROM"],
    docs: "https://docs.aws.amazon.com/ses",
    pkg: "@aws-sdk/client-sesv2",
    pkgVersion: "^3.658.0",
  },

  // ─── CN ────────────────────────────────────────────────────────────────────
  {
    id: "aliyun-dm",
    name: "阿里云邮件推送",
    region: "cn",
    envVars: [
      "ALIYUN_DM_ACCESS_KEY",
      "ALIYUN_DM_ACCESS_SECRET",
      "ALIYUN_DM_ACCOUNT_NAME",
      "ALIYUN_DM_FROM_ALIAS",
    ],
    docs: "https://help.aliyun.com/product/29412.html",
    pkg: "@alicloud/dm20151123",
    pkgVersion: "^3.0.0",
  },
  {
    id: "tencent-ses",
    name: "腾讯云 SES",
    region: "cn",
    envVars: ["TENCENT_SECRET_ID", "TENCENT_SECRET_KEY", "TENCENT_SES_FROM_EMAIL"],
    docs: "https://cloud.tencent.com/document/product/1288",
    pkg: "tencentcloud-sdk-nodejs-ses",
    pkgVersion: "^4.0.900",
  },
  {
    id: "netease",
    name: "网易企业邮箱",
    region: "cn",
    envVars: ["NETEASE_USER", "NETEASE_PASS", "NETEASE_FROM"],
    docs: "https://qiye.163.com/help",
    pkg: "nodemailer",
    pkgVersion: "^6.9.15",
  },

  // ─── None ──────────────────────────────────────────────────────────────────
  {
    id: "none",
    name: "None",
    region: "global",
    envVars: [],
    docs: "",
  },
];

export function getEmailProvider(id: string): EmailProviderMeta | undefined {
  return EMAIL_PROVIDERS.find((p) => p.id === id);
}

export const EMAIL_PROVIDERS_BY_REGION = EMAIL_PROVIDERS.reduce<
  Record<EmailRegion, EmailProviderMeta[]>
>(
  (acc, p) => {
    if (!acc[p.region]) acc[p.region] = [];
    acc[p.region].push(p);
    return acc;
  },
  {} as Record<EmailRegion, EmailProviderMeta[]>,
);
