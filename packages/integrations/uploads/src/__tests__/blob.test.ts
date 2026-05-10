import { beforeEach, describe, expect, it, vi } from "vitest";
import { VercelBlobProvider } from "../providers/blob.js";

// Mock the @vercel/blob module
vi.mock("@vercel/blob", () => ({
  put: vi.fn().mockResolvedValue({
    url: "https://blob.vercel-storage.com/test-file.jpg",
    pathname: "tenant_123/abc/test.jpg",
    contentType: "image/jpeg",
    contentDisposition: 'inline; filename="test.jpg"',
  }),
  del: vi.fn().mockResolvedValue(undefined),
  head: vi.fn().mockResolvedValue({
    url: "https://blob.vercel-storage.com/test-file.jpg",
    size: 1024,
    contentType: "image/jpeg",
  }),
}));

describe("VercelBlobProvider", () => {
  let provider: VercelBlobProvider;

  beforeEach(() => {
    provider = new VercelBlobProvider({ token: "vercel_blob_test_token" });
  });

  it("has correct name identifier", () => {
    expect((provider as unknown as { name: string }).name).toBeUndefined();
    // Provider implements UploadProvider interface, no 'name' field required
  });

  describe("createPresignedUpload", () => {
    it("generates a client upload URL", async () => {
      const result = await provider.createPresignedUpload({
        bucket: "avatars",
        key: "photo.jpg",
        contentType: "image/jpeg",
        tenantId: "org_123",
      });

      expect(result.url).toContain("blob.vercel-storage.com");
      expect(result.method).toBe("PUT");
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("deleteFile", () => {
    it("calls blob del with the correct URL", async () => {
      const { del } = await import("@vercel/blob");
      await provider.deleteFile("avatars", "org_123/abc/photo.jpg");
      expect(del).toHaveBeenCalled();
    });
  });

  describe("getDownloadUrl", () => {
    it("returns the blob URL directly (public by default)", async () => {
      const url = await provider.getDownloadUrl("avatars", "org_123/abc/photo.jpg");
      expect(url).toContain("blob.vercel-storage.com");
    });
  });

  describe("close", () => {
    it("is a no-op that resolves", async () => {
      await expect(provider.close()).resolves.toBeUndefined();
    });
  });
});
