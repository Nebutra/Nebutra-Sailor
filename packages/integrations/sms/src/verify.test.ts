import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SmsProvider } from "./types";
import { initSmsVerification, sendVerificationCode, verifyCode } from "./verify";

class MemoryRedis {
  values = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<unknown> {
    this.values.set(key, value);
    return "OK";
  }

  async del(key: string): Promise<unknown> {
    this.values.delete(key);
    return 1;
  }
}

describe("SMS verification OTP storage", () => {
  let redis: MemoryRedis;
  let sentCode: string;
  let provider: SmsProvider;

  beforeEach(() => {
    sentCode = "";
    redis = new MemoryRedis();
    provider = {
      name: "test",
      send: vi.fn(async (_phone: string, code: string) => {
        sentCode = code;
        return true;
      }),
    };
    initSmsVerification({
      provider,
      redis,
      config: { provider: "custom", codeLength: 6, codeTtl: 300, cooldown: 60 },
    });
  });

  it("stores a one-way OTP digest instead of the plaintext code", async () => {
    const result = await sendVerificationCode("+8613800138000");

    expect(result.success).toBe(true);
    expect(sentCode).toMatch(/^\d{6}$/);
    expect(redis.values.get("sms:code:+8613800138000")).toBeDefined();
    expect(redis.values.get("sms:code:+8613800138000")).not.toBe(sentCode);
    expect(redis.values.get("sms:code:+8613800138000")).not.toContain(sentCode);
  });

  it("verifies the sent OTP against the stored digest", async () => {
    await sendVerificationCode("+8613800138000");

    await expect(verifyCode("+8613800138000", "000000")).resolves.toMatchObject({
      success: false,
    });
    await expect(verifyCode("+8613800138000", sentCode)).resolves.toMatchObject({
      success: true,
    });
  });
});
