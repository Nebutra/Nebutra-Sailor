import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createUploadProvider, getActiveProviderType, resetUploadProvider } from "../factory";
import { LocalUploadProvider } from "../providers/local";

describe("createUploadProvider", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.UPLOAD_PROVIDER;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.S3_ENDPOINT;
    resetUploadProvider();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetUploadProvider();
  });

  it("defaults to local provider when no credentials", () => {
    const provider = createUploadProvider();
    expect(provider).toBeInstanceOf(LocalUploadProvider);
  });

  it("creates local provider with explicit type", () => {
    const provider = createUploadProvider({ type: "local" });
    expect(provider).toBeInstanceOf(LocalUploadProvider);
  });

  it("throws on unknown provider type", () => {
    expect(() => createUploadProvider({ type: "unknown" as "s3" })).toThrow(
      "Unknown upload provider type",
    );
  });
});

describe("getActiveProviderType", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.UPLOAD_PROVIDER;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.S3_ENDPOINT;
    resetUploadProvider();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetUploadProvider();
  });

  it("returns local when no env vars set", () => {
    expect(getActiveProviderType()).toBe("local");
  });

  it("returns s3 when AWS credentials exist", () => {
    process.env.AWS_ACCESS_KEY_ID = "test";
    expect(getActiveProviderType()).toBe("s3");
  });

  it("returns s3 when R2 credentials exist", () => {
    process.env.R2_ACCESS_KEY_ID = "test";
    expect(getActiveProviderType()).toBe("s3");
  });

  it("returns s3 when S3_ENDPOINT exists", () => {
    process.env.S3_ENDPOINT = "http://localhost:9000";
    expect(getActiveProviderType()).toBe("s3");
  });
});
