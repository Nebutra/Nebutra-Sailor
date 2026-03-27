import { createHmac } from "node:crypto";
import { logger } from "@nebutra/logger";
import type { SmsProvider } from "../types.js";

export interface AliyunSmsConfig {
  accessKeyId: string;
  accessKeySecret: string;
  signName: string;
  templateCode: string;
}

export function createAliyunProvider(config?: AliyunSmsConfig): SmsProvider {
  const cfg = config ?? {
    accessKeyId: process.env.ALIYUN_SMS_ACCESS_KEY_ID ?? "",
    accessKeySecret: process.env.ALIYUN_SMS_ACCESS_KEY_SECRET ?? "",
    signName: process.env.ALIYUN_SMS_SIGN_NAME ?? "",
    templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE ?? "",
  };

  return {
    name: "aliyun",
    async send(phone: string, code: string): Promise<boolean> {
      if (!cfg.accessKeyId || !cfg.accessKeySecret) {
        logger.warn("Aliyun SMS credentials not configured, skipping send");
        return false;
      }

      const params = new URLSearchParams({
        PhoneNumbers: phone,
        SignName: cfg.signName,
        TemplateCode: cfg.templateCode,
        TemplateParam: JSON.stringify({ code }),
        Action: "SendSms",
        Version: "2017-05-25",
        Format: "JSON",
        AccessKeyId: cfg.accessKeyId,
        SignatureMethod: "HMAC-SHA1",
        Timestamp: new Date().toISOString(),
        SignatureVersion: "1.0",
        SignatureNonce: Math.random().toString(36).slice(2),
      });

      // Sort and sign per Alibaba Cloud signature spec
      const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
      const canonicalized = sorted
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
      const stringToSign = `GET&${encodeURIComponent("/")}&${encodeURIComponent(canonicalized)}`;
      const signature = createHmac("sha1", `${cfg.accessKeySecret}&`)
        .update(stringToSign)
        .digest("base64");
      params.set("Signature", signature);

      try {
        const res = await fetch(`https://dysmsapi.aliyuncs.com/?${params.toString()}`);
        const data = (await res.json()) as {
          Code?: string;
          Message?: string;
        };
        if (data.Code === "OK") return true;
        logger.warn("Aliyun SMS failed", {
          code: data.Code,
          message: data.Message,
        });
        return false;
      } catch (error) {
        logger.error("Aliyun SMS request failed", error instanceof Error ? error : undefined, {
          provider: "aliyun",
        });
        return false;
      }
    },
  };
}
