import { logger } from "@nebutra/logger";
import type { SmsConfig, SmsProvider } from "./types.js";

const DEFAULT_CONFIG: Required<SmsConfig> = {
  provider: "aliyun",
  codeLength: 6,
  codeTtl: 300,
  cooldown: 60,
};

interface RedisLike {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, opts?: { ex?: number }) => Promise<unknown>;
  del: (key: string) => Promise<unknown>;
}

let redisClient: RedisLike | null = null;
let activeProvider: SmsProvider | null = null;
let config = { ...DEFAULT_CONFIG };

export function initSmsVerification(opts: {
  provider: SmsProvider;
  redis: RedisLike;
  config?: Partial<SmsConfig>;
}): void {
  activeProvider = opts.provider;
  redisClient = opts.redis;
  if (opts.config) config = { ...DEFAULT_CONFIG, ...opts.config };
}

function generateCode(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

function codeKey(phone: string): string {
  return `sms:code:${phone}`;
}

function cooldownKey(phone: string): string {
  return `sms:cooldown:${phone}`;
}

export async function sendVerificationCode(
  phone: string,
): Promise<{ success: boolean; message: string }> {
  if (!activeProvider || !redisClient) {
    return { success: false, message: "SMS service not configured" };
  }

  // Check cooldown
  const existing = await redisClient.get(cooldownKey(phone));
  if (existing) {
    return {
      success: false,
      message: "Please wait before requesting another code",
    };
  }

  const code = generateCode(config.codeLength);

  // Send via provider
  const sent = await activeProvider.send(phone, code);
  if (!sent) {
    return { success: false, message: "Failed to send SMS" };
  }

  // Store code + set cooldown
  await redisClient.set(codeKey(phone), code, { ex: config.codeTtl });
  await redisClient.set(cooldownKey(phone), "1", { ex: config.cooldown });

  logger.info("SMS verification code sent", {
    phone: `${phone.slice(0, 3)}****${phone.slice(-4)}`,
  });
  return { success: true, message: "Verification code sent" };
}

export async function verifyCode(
  phone: string,
  code: string,
): Promise<{ success: boolean; message: string }> {
  if (!redisClient) {
    return { success: false, message: "SMS service not configured" };
  }

  const stored = await redisClient.get(codeKey(phone));
  if (!stored) {
    return { success: false, message: "Code expired or not found" };
  }

  if (stored !== code) {
    return { success: false, message: "Invalid code" };
  }

  // Clean up
  await redisClient.del(codeKey(phone));
  await redisClient.del(cooldownKey(phone));

  return { success: true, message: "Verified" };
}
