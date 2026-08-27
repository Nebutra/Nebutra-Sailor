import { afterEach, describe, expect, it } from "vitest";
import { assertProviderAllowed, envPresent, resolveProviderType } from "../index";

const SAVED = { ...process.env };
afterEach(() => {
  process.env = { ...SAVED };
});

type P = "qstash" | "bullmq" | "memory";

const detectors = [
  { provider: "qstash" as P, when: envPresent("QSTASH_TOKEN") },
  { provider: "bullmq" as P, when: envPresent("REDIS_URL") },
];

describe("resolveProviderType precedence", () => {
  it("1. explicit config wins over everything", () => {
    process.env.QUEUE_PROVIDER = "bullmq";
    process.env.QSTASH_TOKEN = "x";
    expect(
      resolveProviderType<P>({
        explicit: "memory",
        envVarName: "QUEUE_PROVIDER",
        detectors,
        fallback: "memory",
      }),
    ).toBe("memory");
  });

  it("2. env var beats detection", () => {
    process.env.QSTASH_TOKEN = "x"; // would detect qstash
    process.env.QUEUE_PROVIDER = "bullmq";
    expect(
      resolveProviderType<P>({ envVarName: "QUEUE_PROVIDER", detectors, fallback: "memory" }),
    ).toBe("bullmq");
  });

  it("3. detection chain order is honoured", () => {
    process.env.QUEUE_PROVIDER = undefined;
    process.env.REDIS_URL = "redis://x";
    expect(
      resolveProviderType<P>({ envVarName: "QUEUE_PROVIDER", detectors, fallback: "memory" }),
    ).toBe("bullmq");
    process.env.QSTASH_TOKEN = "x";
    expect(
      resolveProviderType<P>({ envVarName: "QUEUE_PROVIDER", detectors, fallback: "memory" }),
    ).toBe("qstash"); // earlier detector wins
  });

  it("4. fallback when nothing matches", () => {
    expect(
      resolveProviderType<P>({ envVarName: "QUEUE_PROVIDER", detectors, fallback: "memory" }),
    ).toBe("memory");
  });

  it("trims/ignores an empty env var", () => {
    process.env.QUEUE_PROVIDER = "   ";
    expect(
      resolveProviderType<P>({ envVarName: "QUEUE_PROVIDER", detectors, fallback: "memory" }),
    ).toBe("memory");
  });
});

describe("envPresent", () => {
  it("is true only for a non-empty value", () => {
    process.env.X = "";
    expect(envPresent("X")()).toBe(false);
    process.env.X = "v";
    expect(envPresent("X")()).toBe(true);
  });
});

describe("assertProviderAllowed", () => {
  it("throws for a disallowed provider in production unless overridden", () => {
    process.env.NODE_ENV = "production";
    expect(() =>
      assertProviderAllowed("memory", {
        disallowedInProd: ["memory"],
        overrideEnv: "ALLOW_MEMORY",
        hint: "configure REDIS_URL",
      }),
    ).toThrow(/production/);
    process.env.ALLOW_MEMORY = "true";
    expect(() =>
      assertProviderAllowed("memory", {
        disallowedInProd: ["memory"],
        overrideEnv: "ALLOW_MEMORY",
        hint: "configure REDIS_URL",
      }),
    ).not.toThrow();
  });

  it("throws the caller's exact message when provided", () => {
    process.env.NODE_ENV = "production";
    expect(() =>
      assertProviderAllowed("memory", {
        disallowedInProd: ["memory"],
        overrideEnv: "X",
        message: "Refusing to use the in-memory queue provider in production",
      }),
    ).toThrow("Refusing to use the in-memory queue provider in production");
  });

  it("never throws outside production", () => {
    process.env.NODE_ENV = "test";
    expect(() =>
      assertProviderAllowed("memory", { disallowedInProd: ["memory"], overrideEnv: "X" }),
    ).not.toThrow();
  });
});
