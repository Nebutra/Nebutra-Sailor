export interface SmsProvider {
  name: string;
  send(phone: string, code: string, templateId?: string): Promise<boolean>;
}

export interface SmsConfig {
  provider: "aliyun" | "tencent" | "custom";
  /** Code length, default 6 */
  codeLength?: number;
  /** TTL in seconds, default 300 (5 minutes) */
  codeTtl?: number;
  /** Cooldown between sends in seconds, default 60 */
  cooldown?: number;
}
