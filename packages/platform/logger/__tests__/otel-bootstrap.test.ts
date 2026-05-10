import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock NodeSDK so we never actually start OTel during tests.
const sdkStart = vi.fn();
const sdkShutdown = vi.fn().mockResolvedValue(undefined);
vi.mock("@opentelemetry/sdk-node", () => ({
  NodeSDK: class MockNodeSDK {
    start = sdkStart;
    shutdown = sdkShutdown;
  },
}));

// Mock the Langfuse exporter so the test doesn't make any network calls.
const langfuseCtor = vi.fn();
vi.mock("langfuse-vercel", () => ({
  LangfuseExporter: class MockLangfuseExporter {
    constructor(params: unknown) {
      langfuseCtor(params);
    }
    export = vi.fn();
    shutdown = vi.fn();
    forceFlush = vi.fn();
  },
}));

vi.mock("@opentelemetry/exporter-trace-otlp-http", () => ({
  OTLPTraceExporter: class MockOTLPTraceExporter {
    export = vi.fn();
    shutdown = vi.fn();
  },
}));

vi.mock("@opentelemetry/sdk-trace-base", async () => {
  const actual = await vi.importActual<typeof import("@opentelemetry/sdk-trace-base")>(
    "@opentelemetry/sdk-trace-base",
  );
  return {
    ...actual,
    BatchSpanProcessor: class MockBatchSpanProcessor {
      constructor(public exporter: unknown) {}
    },
  };
});

import { _resetGlobalOtelForTests, initGlobalOtel } from "../src/otel-bootstrap";

const ENV_KEYS = [
  "OTEL_ENABLED",
  "LANGFUSE_PUBLIC_KEY",
  "LANGFUSE_SECRET_KEY",
  "LANGFUSE_HOST",
  "OTEL_EXPORTER_OTLP_ENDPOINT",
] as const;

describe("initGlobalOtel", () => {
  let savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>;

  beforeEach(() => {
    savedEnv = {};
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    sdkStart.mockClear();
    langfuseCtor.mockClear();
    _resetGlobalOtelForTests();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  it("is a no-op when no exporter env vars are set", () => {
    const sdk = initGlobalOtel({ serviceName: "test" });
    expect(sdk).toBeNull();
    expect(sdkStart).not.toHaveBeenCalled();
    expect(langfuseCtor).not.toHaveBeenCalled();
  });

  it("defers to legacy initOtel when OTEL_ENABLED=true", () => {
    process.env.OTEL_ENABLED = "true";
    process.env.LANGFUSE_PUBLIC_KEY = "pk_test";
    process.env.LANGFUSE_SECRET_KEY = "sk_test";

    const sdk = initGlobalOtel({ serviceName: "test" });
    expect(sdk).toBeNull();
    expect(sdkStart).not.toHaveBeenCalled();
  });

  it("initializes a NodeSDK with the Langfuse exporter when configured", () => {
    process.env.LANGFUSE_PUBLIC_KEY = "pk_test";
    process.env.LANGFUSE_SECRET_KEY = "sk_test";
    process.env.LANGFUSE_HOST = "https://cloud.langfuse.com";

    const sdk = initGlobalOtel({ serviceName: "test" });
    expect(sdk).not.toBeNull();
    expect(sdkStart).toHaveBeenCalledTimes(1);
    expect(langfuseCtor).toHaveBeenCalledWith({
      publicKey: "pk_test",
      secretKey: "sk_test",
      baseUrl: "https://cloud.langfuse.com",
    });
  });

  it("skips Langfuse when includeLangfuse is false even if env is set", () => {
    process.env.LANGFUSE_PUBLIC_KEY = "pk_test";
    process.env.LANGFUSE_SECRET_KEY = "sk_test";
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "https://otlp.example.com";

    const sdk = initGlobalOtel({ serviceName: "test", includeLangfuse: false });
    expect(sdk).not.toBeNull();
    expect(langfuseCtor).not.toHaveBeenCalled();
    expect(sdkStart).toHaveBeenCalledTimes(1);
  });

  it("is idempotent — second call returns the same SDK without re-init", () => {
    process.env.LANGFUSE_PUBLIC_KEY = "pk_test";
    process.env.LANGFUSE_SECRET_KEY = "sk_test";

    const first = initGlobalOtel({ serviceName: "test" });
    const second = initGlobalOtel({ serviceName: "test" });
    expect(first).toBe(second);
    expect(sdkStart).toHaveBeenCalledTimes(1);
  });
});
