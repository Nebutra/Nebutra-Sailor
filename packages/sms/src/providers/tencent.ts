import { createHash, createHmac } from "node:crypto";
import { logger } from "@nebutra/logger";
import type { SmsProvider } from "../types.js";

export interface TencentSmsConfig {
  secretId: string;
  secretKey: string;
  appId: string;
  signName: string;
  templateId: string;
}

export function createTencentProvider(config?: TencentSmsConfig): SmsProvider {
  const cfg = config ?? {
    secretId: process.env.TENCENT_SMS_SECRET_ID ?? "",
    secretKey: process.env.TENCENT_SMS_SECRET_KEY ?? "",
    appId: process.env.TENCENT_SMS_APP_ID ?? "",
    signName: process.env.TENCENT_SMS_SIGN_NAME ?? "",
    templateId: process.env.TENCENT_SMS_TEMPLATE_ID ?? "",
  };

  return {
    name: "tencent",
    async send(phone: string, code: string): Promise<boolean> {
      if (!cfg.secretId || !cfg.secretKey) {
        logger.warn("Tencent SMS credentials not configured, skipping send");
        return false;
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const date = new Date(timestamp * 1000).toISOString().slice(0, 10);

      const body = JSON.stringify({
        PhoneNumberSet: [phone.startsWith("+") ? phone : `+86${phone}`],
        SmsSdkAppId: cfg.appId,
        SignName: cfg.signName,
        TemplateId: cfg.templateId,
        TemplateParamSet: [code],
      });

      // TC3-HMAC-SHA256 signing
      const hashedPayload = createHash("sha256").update(body).digest("hex");
      const canonicalRequest = [
        "POST",
        "/",
        "",
        "content-type:application/json",
        "host:sms.tencentcloudapi.com",
        "",
        "content-type;host",
        hashedPayload,
      ].join("\n");
      const credentialScope = `${date}/sms/tc3_request`;
      const hashedCanonical = createHash("sha256").update(canonicalRequest).digest("hex");
      const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${hashedCanonical}`;

      const secretDate = createHmac("sha256", `TC3${cfg.secretKey}`).update(date).digest();
      const secretService = createHmac("sha256", secretDate).update("sms").digest();
      const secretSigning = createHmac("sha256", secretService).update("tc3_request").digest();
      const signature = createHmac("sha256", secretSigning).update(stringToSign).digest("hex");

      const authorization = `TC3-HMAC-SHA256 Credential=${cfg.secretId}/${credentialScope}, SignedHeaders=content-type;host, Signature=${signature}`;

      try {
        const res = await fetch("https://sms.tencentcloudapi.com", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Host: "sms.tencentcloudapi.com",
            "X-TC-Action": "SendSms",
            "X-TC-Version": "2021-01-11",
            "X-TC-Timestamp": String(timestamp),
            Authorization: authorization,
          },
          body,
        });
        const data = (await res.json()) as {
          Response?: {
            SendStatusSet?: Array<{ Code?: string }>;
          };
        };
        const status = data.Response?.SendStatusSet?.[0];
        if (status?.Code === "Ok") return true;
        logger.warn("Tencent SMS failed", { status });
        return false;
      } catch (error) {
        logger.error("Tencent SMS request failed", error instanceof Error ? error : undefined, {
          provider: "tencent",
        });
        return false;
      }
    },
  };
}
