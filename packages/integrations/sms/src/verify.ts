import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { logger } from "@nebutra/logger";
import type { SmsConfig, SmsProvider } from "./types";

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
  return Array.from({ length }, () => randomInt(0, 10)).join("");
}

function codeKey(phone: string): string {
  return `sms:code:${phone}`;
}

function cooldownKey(phone: string): string {
  return `sms:cooldown:${phone}`;
}

function hashCode(code: string, salt = randomBytes(16).toString("base64url")): string {
  const digest = createHash("sha256").update(`${salt}:${code}`, "utf8").digest("base64url");
  return JSON.stringify({ v: 1, algorithm: "sha256", salt, digest });
}

function verifyStoredCode(stored: string, code: string): boolean {
  try {
    const parsed = JSON.parse(stored) as {
      v?: unknown;
      algorithm?: unknown;
      salt?: unknown;
      digest?: unknown;
    };
    if (
      parsed.v !== 1 ||
      parsed.algorithm !== "sha256" ||
      typeof parsed.salt !== "string" ||
      typeof parsed.digest !== "string"
    ) {
      return false;
    }

    const expected = createHash("sha256")
      .update(`${parsed.salt}:${code}`, "utf8")
      .digest("base64url");
    const storedDigest = Buffer.from(parsed.digest, "utf8");
    const expectedDigest = Buffer.from(expected, "utf8");
    return (
      storedDigest.length === expectedDigest.length && timingSafeEqual(storedDigest, expectedDigest)
    );
  } catch {
    return false;
  }
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

  // Store a one-way digest so Redis compromise does not expose usable OTPs.
  await redisClient.set(codeKey(phone), hashCode(code), { ex: config.codeTtl });
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

  if (!verifyStoredCode(stored, code)) {
    return { success: false, message: "Invalid code" };
  }

  // Clean up
  await redisClient.del(codeKey(phone));
  await redisClient.del(cooldownKey(phone));

  return { success: true, message: "Verified" };
}
