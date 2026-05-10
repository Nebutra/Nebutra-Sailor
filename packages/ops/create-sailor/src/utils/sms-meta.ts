/**
 * SMS provider registry.
 *
 * Single source of truth for the create-sailor CLI to drive prompts,
 * env-var injection, and code generation for transactional SMS providers.
 */

export type SmsProviderId =
  | "twilio"
  | "messagebird"
  | "plivo"
  | "aliyun-sms"
  | "tencent-sms"
  | "yunpian"
  | "none";

export type SmsRegion = "global" | "cn" | "both";

export interface SmsProviderMeta {
  id: SmsProviderId;
  name: string;
  region: SmsRegion;
  envVars: string[];
  docs: string;
  /**
   * npm package(s) referenced by the generated wrapper.
   */
  pkgs?: string[];
}

export const SMS_PROVIDERS: SmsProviderMeta[] = [
  {
    id: "twilio",
    name: "Twilio",
    region: "global",
    envVars: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
    docs: "https://www.twilio.com/docs/sms",
    pkgs: ["twilio"],
  },
  {
    id: "messagebird",
    name: "MessageBird (Bird)",
    region: "global",
    envVars: ["MESSAGEBIRD_ACCESS_KEY", "MESSAGEBIRD_ORIGINATOR"],
    docs: "https://developers.messagebird.com/api/sms-messaging/",
    pkgs: ["messagebird"],
  },
  {
    id: "plivo",
    name: "Plivo",
    region: "global",
    envVars: ["PLIVO_AUTH_ID", "PLIVO_AUTH_TOKEN", "PLIVO_FROM_NUMBER"],
    docs: "https://www.plivo.com/docs/sms/",
    pkgs: ["plivo"],
  },
  {
    id: "aliyun-sms",
    name: "阿里云短信 Aliyun SMS",
    region: "cn",
    envVars: [
      "ALIYUN_SMS_ACCESS_KEY",
      "ALIYUN_SMS_ACCESS_SECRET",
      "ALIYUN_SMS_SIGN_NAME",
      "ALIYUN_SMS_TEMPLATE_CODE",
      "ALIYUN_SMS_ENDPOINT",
    ],
    docs: "https://help.aliyun.com/product/44282.html",
    pkgs: ["@alicloud/dysmsapi20170525", "@alicloud/openapi-client"],
  },
  {
    id: "tencent-sms",
    name: "腾讯云短信 Tencent SMS",
    region: "cn",
    envVars: [
      "TENCENT_SMS_SECRET_ID",
      "TENCENT_SMS_SECRET_KEY",
      "TENCENT_SMS_SDK_APP_ID",
      "TENCENT_SMS_SIGN_NAME",
      "TENCENT_SMS_TEMPLATE_ID",
      "TENCENT_SMS_REGION",
    ],
    docs: "https://cloud.tencent.com/document/product/382",
    pkgs: ["tencentcloud-sdk-nodejs-sms"],
  },
  {
    id: "yunpian",
    name: "云片 Yunpian",
    region: "cn",
    envVars: ["YUNPIAN_API_KEY", "YUNPIAN_SIGN"],
    docs: "https://www.yunpian.com/official/document/sms/zh_CN/introduction_product_intro",
    pkgs: ["yunpian-nodejs-sdk"],
  },
  {
    id: "none",
    name: "None",
    region: "both",
    envVars: [],
    docs: "",
  },
];

export const SMS_BY_REGION = SMS_PROVIDERS.reduce<Record<SmsRegion, SmsProviderMeta[]>>(
  (acc, p) => {
    if (!acc[p.region]) acc[p.region] = [];
    acc[p.region].push(p);
    return acc;
  },
  {} as Record<SmsRegion, SmsProviderMeta[]>,
);

export function getSmsProvider(id: string): SmsProviderMeta | undefined {
  return SMS_PROVIDERS.find((p) => p.id === id);
}
